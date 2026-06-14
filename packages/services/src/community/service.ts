import "server-only"

// F20 Community Requests Board — service layer.
//
// Pure functions: every entry takes (db, ctx, args). Authorization rules
// live here (not in the route handler) — see the locked review for the
// full decision matrix. The route handlers under
// apps/web/src/app/api/v1/community/* are thin adapters.

import { and, desc, eq, ilike, or, sql } from "drizzle-orm"
import {
  app_settings,
  communityPost,
  postInterest,
  user,
} from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type { CallerContext } from "@aira/api/context"
import { ApiError } from "@aira/api/errors"
import { createAudit } from "@aira/db/audit"
import type {
  AdminPostRow,
  CommunityPostStatus,
  InterestRow,
  PostRow,
  StatusCounts,
} from "@aira/validators/community"
import { createNotification } from "../notifications"

function auditClient(ctx: CallerContext): "web" | "mobile" {
  return ctx.source === "mobile" ? "mobile" : "web"
}

const DEFAULT_EXPIRY_DAYS = 30

// ─── Row projections ────────────────────────────────────────────────────────

interface DbPostRow {
  id: string
  title: string
  body: string | null
  status: CommunityPostStatus
  user_id: string
  author_name: string
  interest_count: number
  expires_at: Date | null
  approved_at: Date | null
  created_at: Date
  rejected_reason: string | null
  author_email: string | null
}

function toPostRow(row: DbPostRow): PostRow {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    status: row.status,
    user_id: row.user_id,
    author_name: row.author_name,
    interest_count: row.interest_count,
    expires_at: row.expires_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  }
}

function toAdminPostRow(row: DbPostRow): AdminPostRow {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    status: row.status,
    user_id: row.user_id,
    author_name: row.author_name,
    author_email: row.author_email,
    rejected_reason: row.rejected_reason,
    interest_count: row.interest_count,
    expires_at: row.expires_at?.toISOString() ?? null,
    approved_at: row.approved_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  }
}

const POST_SELECT = {
  id: communityPost.id,
  title: communityPost.title,
  body: communityPost.body,
  status: communityPost.status,
  user_id: communityPost.user_id,
  author_name: sql<string>`COALESCE(${user.name}, ${user.email})`,
  author_email: user.email,
  interest_count: communityPost.interest_count,
  expires_at: communityPost.expires_at,
  approved_at: communityPost.approved_at,
  created_at: communityPost.created_at,
  rejected_reason: communityPost.rejected_reason,
} as const

// ─── Read: list posts (public board) ────────────────────────────────────────

export interface ListPostsArgs {
  q?: string | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export interface ListPostsResult {
  items: PostRow[]
  total: number
  page: number
  pageSize: number
}

export async function listPosts(
  db: Database,
  _ctx: CallerContext | null,
  args: ListPostsArgs = {},
): Promise<ListPostsResult> {
  const page = args.page ?? 1
  const pageSize = args.pageSize ?? 10
  const offset = (page - 1) * pageSize

  const searchClause = args.q
    ? or(
        ilike(communityPost.title, `%${args.q}%`),
        ilike(communityPost.body, `%${args.q}%`),
      )
    : undefined

  const whereClause = and(
    eq(communityPost.status, "approved"),
    searchClause,
  )

  const rows = await db
    .select(POST_SELECT)
    .from(communityPost)
    .leftJoin(user, eq(user.id, communityPost.user_id))
    .where(whereClause)
    .orderBy(desc(communityPost.created_at))
    .limit(pageSize)
    .offset(offset)

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(communityPost)
    .where(whereClause)

  return {
    items: rows.map(toPostRow),
    total: countRow?.count ?? 0,
    page,
    pageSize,
  }
}

// ─── Read: get a single post ────────────────────────────────────────────────

export interface GetPostResult {
  post: PostRow | null
  is_author: boolean
}

/**
 * Public read — only returns approved or expired posts to non-authors. The
 * post author always sees their own row regardless of status so the detail
 * page can show pending/rejected state.
 */
export async function getPost(
  db: Database,
  ctx: CallerContext | null,
  args: { id: string },
): Promise<GetPostResult> {
  const [row] = await db
    .select(POST_SELECT)
    .from(communityPost)
    .leftJoin(user, eq(user.id, communityPost.user_id))
    .where(eq(communityPost.id, args.id))
    .limit(1)

  if (!row) {
    return { post: null, is_author: false }
  }

  const isAuthor = ctx?.userId === row.user_id
  const publiclyVisible = row.status === "approved" || row.status === "expired"

  if (!isAuthor && !publiclyVisible) {
    return { post: null, is_author: false }
  }

  return { post: toPostRow(row), is_author: isAuthor }
}

// ─── Write: create a post ───────────────────────────────────────────────────

export interface CreatePostArgs {
  title: string
  body?: string | undefined
}

export async function createPost(
  db: Database,
  ctx: CallerContext,
  args: CreatePostArgs,
): Promise<{ post: PostRow }> {
  // One active (pending OR approved) post per user — locked review decision.
  const [existing] = await db
    .select({ id: communityPost.id, status: communityPost.status })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.user_id, ctx.userId),
        or(
          eq(communityPost.status, "pending"),
          eq(communityPost.status, "approved"),
        ),
      ),
    )
    .limit(1)

  if (existing) {
    throw new ApiError({
      status: 409,
      code: "community.active_post_exists",
      message:
        existing.status === "pending"
          ? "You already have a request awaiting moderation."
          : "You already have an active request. Wait for it to expire or be resolved before posting another.",
    })
  }

  const [inserted] = await db
    .insert(communityPost)
    .values({
      user_id: ctx.userId,
      title: args.title,
      body: args.body && args.body.length > 0 ? args.body : null,
      status: "pending",
    })
    .returning({ id: communityPost.id })

  if (!inserted) {
    throw ApiError.internal(
      "community.create_failed",
      "Failed to create post.",
    )
  }

  const result = await getPost(db, ctx, { id: inserted.id })
  if (!result.post) {
    throw ApiError.internal(
      "community.create_lookup_failed",
      "Post created but could not be loaded.",
    )
  }
  return { post: result.post }
}

// ─── Write: admin moderation ────────────────────────────────────────────────

async function readExpiryDays(db: Database): Promise<number> {
  const [row] = await db
    .select({ value: app_settings.value })
    .from(app_settings)
    .where(eq(app_settings.key, "posts_expiry_days"))
    .limit(1)
  const n = row ? Number.parseInt(row.value, 10) : DEFAULT_EXPIRY_DAYS
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_EXPIRY_DAYS
}

async function getAdminRow(
  db: Database,
  id: string,
): Promise<AdminPostRow> {
  const [row] = await db
    .select(POST_SELECT)
    .from(communityPost)
    .leftJoin(user, eq(user.id, communityPost.user_id))
    .where(eq(communityPost.id, id))
    .limit(1)
  if (!row) {
    throw ApiError.notFound("community.post_not_found", "Post not found.")
  }
  return toAdminPostRow(row)
}

export async function approvePost(
  db: Database,
  _ctx: CallerContext,
  args: { id: string },
): Promise<{ post: AdminPostRow }> {
  const expiryDays = await readExpiryDays(db)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000)

  const [updated] = await db
    .update(communityPost)
    .set({
      status: "approved",
      approved_at: now,
      expires_at: expiresAt,
      rejected_reason: null,
    })
    .where(eq(communityPost.id, args.id))
    .returning({ id: communityPost.id })

  if (!updated) {
    throw ApiError.notFound("community.post_not_found", "Post not found.")
  }

  return { post: await getAdminRow(db, updated.id) }
}

export async function rejectPost(
  db: Database,
  _ctx: CallerContext,
  args: { id: string; rejected_reason?: string | undefined },
): Promise<{ post: AdminPostRow }> {
  const [updated] = await db
    .update(communityPost)
    .set({
      status: "rejected",
      rejected_reason: args.rejected_reason ?? null,
    })
    .where(eq(communityPost.id, args.id))
    .returning({ id: communityPost.id })

  if (!updated) {
    throw ApiError.notFound("community.post_not_found", "Post not found.")
  }

  return { post: await getAdminRow(db, updated.id) }
}

// ─── Write: interests ───────────────────────────────────────────────────────

export interface AddInterestArgs {
  id: string
  message?: string | undefined
}

export async function addInterest(
  db: Database,
  ctx: CallerContext,
  args: AddInterestArgs,
): Promise<{ ok: true; interest_count: number }> {
  // Post must exist and be approved (active). Authors can't help on their
  // own post; duplicates are surfaced via the unique index.
  const [post] = await db
    .select({
      id: communityPost.id,
      user_id: communityPost.user_id,
      status: communityPost.status,
      title: communityPost.title,
    })
    .from(communityPost)
    .where(eq(communityPost.id, args.id))
    .limit(1)

  if (!post) {
    throw ApiError.notFound("community.post_not_found", "Post not found.")
  }
  if (post.status !== "approved") {
    throw ApiError.badRequest(
      "community.post_not_active",
      "This request is no longer accepting offers to help.",
    )
  }
  if (post.user_id === ctx.userId) {
    throw new ApiError({
      status: 409,
      code: "community.self_interest",
      message: "You can't offer to help on your own request.",
    })
  }

  const message = args.message && args.message.length > 0 ? args.message : null

  try {
    await db.insert(postInterest).values({
      post_id: args.id,
      user_id: ctx.userId,
      message,
    })
  } catch (err) {
    // Duplicate via unique (post_id, user_id) — surface a clean 409.
    const code = (err as { code?: string }).code
    if (code === "23505") {
      throw new ApiError({
        status: 409,
        code: "community.already_interested",
        message: "You've already offered to help on this request.",
      })
    }
    throw err
  }

  // Bump the denormalized counter only on a real insert so the bell
  // notification and counter stay in lockstep.
  await db
    .update(communityPost)
    .set({ interest_count: sql`${communityPost.interest_count} + 1` })
    .where(eq(communityPost.id, args.id))

  const [responder] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)
  const responderName = responder?.name || responder?.email || "Someone"

  await createNotification(db, ctx, {
    userId: post.user_id,
    body: {
      kind: "post_interest",
      post_id: post.id,
      post_title: post.title,
      responder_id: ctx.userId,
      responder_name: responderName,
      message,
    },
  })

  const [counted] = await db
    .select({ interest_count: communityPost.interest_count })
    .from(communityPost)
    .where(eq(communityPost.id, args.id))
    .limit(1)

  return { ok: true, interest_count: counted?.interest_count ?? 0 }
}

export async function removeInterest(
  db: Database,
  ctx: CallerContext,
  args: { id: string },
): Promise<{ ok: true; interest_count: number }> {
  const deleted = await db
    .delete(postInterest)
    .where(
      and(
        eq(postInterest.post_id, args.id),
        eq(postInterest.user_id, ctx.userId),
      ),
    )
    .returning({ id: postInterest.id })

  if (deleted.length > 0) {
    await db
      .update(communityPost)
      .set({
        interest_count: sql`GREATEST(${communityPost.interest_count} - 1, 0)`,
      })
      .where(eq(communityPost.id, args.id))
  }

  const [counted] = await db
    .select({ interest_count: communityPost.interest_count })
    .from(communityPost)
    .where(eq(communityPost.id, args.id))
    .limit(1)

  return { ok: true, interest_count: counted?.interest_count ?? 0 }
}

export async function listInterests(
  db: Database,
  ctx: CallerContext,
  args: { id: string },
): Promise<{ items: InterestRow[] }> {
  // Author-only access — locked review decision.
  const [post] = await db
    .select({ user_id: communityPost.user_id })
    .from(communityPost)
    .where(eq(communityPost.id, args.id))
    .limit(1)

  if (!post) {
    throw ApiError.notFound("community.post_not_found", "Post not found.")
  }
  if (post.user_id !== ctx.userId) {
    throw ApiError.forbidden(
      "Only the post author can see who offered to help.",
    )
  }

  const rows = await db
    .select({
      id: postInterest.id,
      responder_id: postInterest.user_id,
      responder_name: sql<string>`COALESCE(${user.name}, ${user.email}, 'Someone')`,
      message: postInterest.message,
      created_at: postInterest.created_at,
    })
    .from(postInterest)
    .leftJoin(user, eq(user.id, postInterest.user_id))
    .where(eq(postInterest.post_id, args.id))
    .orderBy(desc(postInterest.created_at))

  return {
    items: rows.map((r) => ({
      id: r.id,
      responder_id: r.responder_id,
      responder_name: r.responder_name,
      message: r.message,
      created_at: r.created_at.toISOString(),
    })),
  }
}

// ─── Cron: expire stale approved posts ──────────────────────────────────────

export async function expirePosts(
  db: Database,
): Promise<{ rowsAffected: number }> {
  // Only approved posts that have passed their expiry. PENDING posts have a
  // NULL expires_at so they're naturally excluded; admins clean those up
  // manually via the moderation queue.
  const rows = await db
    .update(communityPost)
    .set({ status: "expired" })
    .where(
      and(
        eq(communityPost.status, "approved"),
        sql`${communityPost.expires_at} IS NOT NULL`,
        sql`${communityPost.expires_at} <= now()`,
      ),
    )
    .returning({ id: communityPost.id })
  return { rowsAffected: rows.length }
}

// ─── Admin list ─────────────────────────────────────────────────────────────

export interface AdminListPostsArgs {
  status?: CommunityPostStatus | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export async function adminListPosts(
  db: Database,
  _ctx: CallerContext,
  args: AdminListPostsArgs = {},
): Promise<{
  items: AdminPostRow[]
  total: number
  page: number
  pageSize: number
  status_counts: StatusCounts
}> {
  const page = args.page ?? 1
  const pageSize = args.pageSize ?? 25
  const offset = (page - 1) * pageSize

  const whereClause = args.status
    ? eq(communityPost.status, args.status)
    : undefined

  const [rows, countRow, status_counts] = await Promise.all([
    db
      .select(POST_SELECT)
      .from(communityPost)
      .leftJoin(user, eq(user.id, communityPost.user_id))
      .where(whereClause)
      .orderBy(desc(communityPost.created_at))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(communityPost)
      .where(whereClause)
      .then((r) => r[0]),
    getAdminPostStatusCounts(db),
  ])

  return {
    items: rows.map(toAdminPostRow),
    total: countRow?.count ?? 0,
    page,
    pageSize,
    status_counts,
  }
}

/**
 * One `SELECT status, count(*) GROUP BY status` per call. Returns zero for
 * any status that has no rows so the admin filter chips always render
 * consistent badges.
 */
export async function getAdminPostStatusCounts(
  db: Database,
): Promise<StatusCounts> {
  const rows = await db
    .select({
      status: communityPost.status,
      count: sql<number>`count(*)::int`,
    })
    .from(communityPost)
    .groupBy(communityPost.status)

  const counts: StatusCounts = {
    pending: 0,
    approved: 0,
    expired: 0,
    rejected: 0,
  }
  for (const r of rows) {
    counts[r.status] = r.count
  }
  return counts
}

/**
 * Admin-side single post read. No visibility filter — returns the row
 * regardless of status (including rejected) so the moderation detail page
 * can render everything. Authorization gate is at the op layer
 * (`permission: "admin"`); the service treats the admin as trusted.
 */
export async function adminGetPost(
  db: Database,
  _ctx: CallerContext,
  args: { id: string },
): Promise<{ post: AdminPostRow | null }> {
  const [row] = await db
    .select(POST_SELECT)
    .from(communityPost)
    .leftJoin(user, eq(user.id, communityPost.user_id))
    .where(eq(communityPost.id, args.id))
    .limit(1)
  return { post: row ? toAdminPostRow(row) : null }
}

// ─── Admin: post edit / delete / respondent visibility (F20 v2) ────────────

/**
 * Edit the title and/or body of a post regardless of status. Status is
 * intentionally NOT changed by an edit (locked review decision — keep
 * approve/reject as the only state-change actions). At least one of
 * title or body must be defined; the validator guards this at the
 * boundary.
 *
 * Body of "" (empty after trim) or explicit null both clear the body.
 * Audit row written BEFORE the update inside one transaction so a failed
 * audit rolls back the change.
 */
export async function editPost(
  db: Database,
  ctx: CallerContext,
  args: { id: string; title?: string; body?: string | null },
): Promise<{ post: AdminPostRow }> {
  // Capture the row before the transaction so we can short-circuit on
  // not-found without opening a tx — and so the before/after pair has a
  // consistent snapshot to compare against.
  const [before] = await db
    .select({ title: communityPost.title, body: communityPost.body })
    .from(communityPost)
    .where(eq(communityPost.id, args.id))
    .limit(1)

  if (!before) {
    throw ApiError.notFound("community.post_not_found", "Post not found.")
  }

  // Build the field set + per-field before/after pairs. The trimmed-empty
  // body case is normalised to null here so the audit captures the canonical
  // "cleared" state.
  const update: { title?: string; body?: string | null } = {}
  const fields: Array<"title" | "body"> = []
  const meta: {
    title?: { from: string; to: string }
    body?: { from: string | null; to: string | null }
  } = {}

  if (args.title !== undefined && args.title !== before.title) {
    update.title = args.title
    fields.push("title")
    meta.title = { from: before.title, to: args.title }
  }

  if (args.body !== undefined) {
    const next = args.body === null || args.body.length === 0 ? null : args.body
    if (next !== before.body) {
      update.body = next
      fields.push("body")
      meta.body = { from: before.body, to: next }
    }
  }

  // No-op update (admin saved without changing anything). Return the row
  // as-is rather than write a meaningless audit row.
  if (fields.length === 0) {
    const fresh = await getAdminRow(db, args.id)
    return { post: fresh }
  }

  await db.transaction(async (tx) => {
    const audit = createAudit(tx)
    await audit({
      actorId: ctx.userId,
      action: "community.post_edited",
      target: { type: "community_post", id: args.id },
      meta: { kind: "community.post_edited", fields, ...meta },
      client: auditClient(ctx),
    })

    await tx
      .update(communityPost)
      .set(update)
      .where(eq(communityPost.id, args.id))
  })

  return { post: await getAdminRow(db, args.id) }
}

/**
 * Hard-delete a post. The `post_interest` rows cascade (FK ON DELETE CASCADE
 * was set in migration 0021). Audit row is written BEFORE the delete inside
 * one transaction — the row is unreadable after delete, so this is the only
 * point where we can capture the snapshot for the trail.
 *
 * If the audit insert fails, the transaction rolls back and the post stays
 * (same convention as users.ts / app_settings).
 */
export async function deletePost(
  db: Database,
  ctx: CallerContext,
  args: { id: string },
): Promise<{ ok: true }> {
  const [snapshot] = await db
    .select({
      title: communityPost.title,
      body: communityPost.body,
      status: communityPost.status,
      author_id: communityPost.user_id,
      interest_count: communityPost.interest_count,
    })
    .from(communityPost)
    .where(eq(communityPost.id, args.id))
    .limit(1)

  if (!snapshot) {
    throw ApiError.notFound("community.post_not_found", "Post not found.")
  }

  await db.transaction(async (tx) => {
    const audit = createAudit(tx)
    await audit({
      actorId: ctx.userId,
      action: "community.post_deleted",
      target: { type: "community_post", id: args.id },
      meta: {
        kind: "community.post_deleted",
        title: snapshot.title,
        body: snapshot.body,
        status: snapshot.status,
        author_id: snapshot.author_id,
        interest_count: snapshot.interest_count,
      },
      client: auditClient(ctx),
    })

    await tx.delete(communityPost).where(eq(communityPost.id, args.id))
  })

  return { ok: true }
}

/**
 * Admin-only respondent list. Mirrors listInterests but skips the
 * author-only guard — the operation's `permission: "admin"` gate is the
 * real ACL. Read-only; no audit. (Reading is high-frequency; auditing
 * every view would balloon the log without proportional value.)
 */
export async function adminListInterests(
  db: Database,
  _ctx: CallerContext,
  args: { id: string },
): Promise<{ items: InterestRow[] }> {
  const [post] = await db
    .select({ id: communityPost.id })
    .from(communityPost)
    .where(eq(communityPost.id, args.id))
    .limit(1)

  if (!post) {
    throw ApiError.notFound("community.post_not_found", "Post not found.")
  }

  const rows = await db
    .select({
      id: postInterest.id,
      responder_id: postInterest.user_id,
      responder_name: sql<string>`COALESCE(${user.name}, ${user.email}, 'Someone')`,
      message: postInterest.message,
      created_at: postInterest.created_at,
    })
    .from(postInterest)
    .leftJoin(user, eq(user.id, postInterest.user_id))
    .where(eq(postInterest.post_id, args.id))
    .orderBy(desc(postInterest.created_at))

  return {
    items: rows.map((r) => ({
      id: r.id,
      responder_id: r.responder_id,
      responder_name: r.responder_name,
      message: r.message,
      created_at: r.created_at.toISOString(),
    })),
  }
}

