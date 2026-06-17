import "server-only"

// F20 v3 — community post comments service.
//
// Thread-style discussion thread on every approved post. v1 supports 1
// level of replies; the cap is enforced here in createComment (a buggy
// caller can't bypass it). Comments auto-publish (post-moderation): the
// row inserts with status='visible' and admin moderation flips it to
// hidden (the body stays in the DB but is never projected to the wire
// while hidden — defence in depth so a future bug can't leak a
// moderated body).
//
// Cascade graph:
//   - delete a post -> cascade-deletes its comments (Drizzle FK)
//   - delete a top-level comment -> cascade-deletes its replies
//
// Notification fan-out (best-effort, inside the op handler, not here):
//   - top-level comment -> notify post author (unless commenter === author)
//   - reply             -> notify parent commenter (unless reply author ===
//                          parent author === post author, in which case the
//                          author already got the top-level notification)

import { asc, eq, sql } from "drizzle-orm"
import {
  communityPost,
  postComment,
  user,
} from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type { CallerContext } from "@aira/api/context"
import { ApiError } from "@aira/api/errors"
import { createAudit } from "@aira/db/audit"

function auditClient(ctx: CallerContext): "web" | "mobile" {
  return ctx.source === "mobile" ? "mobile" : "web"
}

// ─── Row projections ────────────────────────────────────────────────────────

/** Public/admin wire shape for a single comment. Hidden rows project
 *  null body + null user fields so the moderation hides the content
 *  end-to-end. status is kept so the UI can render a tombstone. */
export interface CommentRow {
  id: string
  post_id: string
  parent_id: string | null
  user_id: string | null
  user_name: string | null
  body: string | null
  status: "visible" | "hidden"
  created_at: string
}

/** Thread shape: top-level comments each with their replies array.
 *  Replies under a hidden top-level still render — the parent renders
 *  as a tombstone, replies under it render normally. */
export interface CommentThreadNode extends CommentRow {
  replies: CommentRow[]
}

function projectRow(
  row: {
    id: string
    post_id: string
    parent_id: string | null
    user_id: string
    user_name: string | null
    body: string
    status: "visible" | "hidden"
    created_at: Date
  },
  viewerIsAdmin: boolean,
): CommentRow {
  if (row.status === "hidden" && !viewerIsAdmin) {
    return {
      id: row.id,
      post_id: row.post_id,
      parent_id: row.parent_id,
      user_id: null,
      user_name: null,
      body: null,
      status: "hidden",
      created_at: row.created_at.toISOString(),
    }
  }
  return {
    id: row.id,
    post_id: row.post_id,
    parent_id: row.parent_id,
    user_id: row.user_id,
    user_name: row.user_name,
    body: row.body,
    status: row.status,
    created_at: row.created_at.toISOString(),
  }
}

// ─── List comments for a post ───────────────────────────────────────────────

const COMMENT_PAGE_CAP = 50

export interface ListCommentsResult {
  items: CommentThreadNode[]
}

/**
 * Public list — returns top-level comments (parent_id IS NULL) with
 * their replies grouped under each. Sorted ASC by created_at within each
 * tier so conversation reads top-to-bottom.
 *
 * `viewerIsAdmin` controls projection of hidden rows: admin viewers see
 * the body (so the moderation strip can display what it hid); everyone
 * else sees the tombstone shape.
 *
 * v1: cap top-level at 50; replies under each are unbounded. If a post
 * hits 50 we'll add cursor paging in v2.
 */
export async function listComments(
  db: Database,
  _ctx: CallerContext | null,
  args: { post_id: string; viewerIsAdmin?: boolean },
): Promise<ListCommentsResult> {
  const viewerIsAdmin = args.viewerIsAdmin ?? false

  const rows = await db
    .select({
      id: postComment.id,
      post_id: postComment.post_id,
      parent_id: postComment.parent_id,
      user_id: postComment.user_id,
      user_name: sql<string | null>`COALESCE(${user.name}, ${user.email})`,
      body: postComment.body,
      status: postComment.status,
      created_at: postComment.created_at,
    })
    .from(postComment)
    .leftJoin(user, eq(user.id, postComment.user_id))
    .where(eq(postComment.post_id, args.post_id))
    .orderBy(asc(postComment.created_at))

  // Group top-level + replies; cap top-level at COMMENT_PAGE_CAP.
  const topLevel: CommentThreadNode[] = []
  const byParent = new Map<string, CommentRow[]>()
  for (const r of rows) {
    const projected = projectRow(r, viewerIsAdmin)
    if (r.parent_id === null) {
      if (topLevel.length < COMMENT_PAGE_CAP) {
        topLevel.push({ ...projected, replies: [] })
      }
    } else {
      const bucket = byParent.get(r.parent_id) ?? []
      bucket.push(projected)
      byParent.set(r.parent_id, bucket)
    }
  }
  for (const node of topLevel) {
    node.replies = byParent.get(node.id) ?? []
  }
  return { items: topLevel }
}

// ─── Create a comment / reply ───────────────────────────────────────────────

export interface CreateCommentArgs {
  post_id: string
  body: string
  parent_id?: string
}

export interface CreateCommentResult {
  comment: CommentRow
  /** The post's author user_id — exposed so the op handler can fire a
   *  notification without re-querying. */
  post_author_id: string
  /** The post title — for the notification body. */
  post_title: string
  /** The parent comment's author user_id (null for top-level). Needed
   *  by the op handler to send the reply-to-parent notification. */
  parent_author_id: string | null
}

/**
 * Insert a new comment. The 1-level reply cap is enforced here: if a
 * `parent_id` is supplied, we look up the parent and reject when its
 * own `parent_id` is non-null. This + the type system are the only
 * guards — Postgres CHECK can't take subqueries.
 *
 * Comments can only be left on APPROVED posts (pending/rejected/expired
 * surfaces don't accept new discussion).
 */
export async function createComment(
  db: Database,
  ctx: CallerContext,
  args: CreateCommentArgs,
): Promise<CreateCommentResult> {
  const [post] = await db
    .select({
      id: communityPost.id,
      status: communityPost.status,
      user_id: communityPost.user_id,
      title: communityPost.title,
    })
    .from(communityPost)
    .where(eq(communityPost.id, args.post_id))
    .limit(1)

  if (!post) {
    throw ApiError.notFound("community.post_not_found", "Post not found.")
  }
  if (post.status !== "approved") {
    throw ApiError.badRequest(
      "community.post_not_active",
      "This post isn't accepting comments.",
    )
  }

  let parent_author_id: string | null = null
  if (args.parent_id !== undefined) {
    const [parent] = await db
      .select({
        id: postComment.id,
        post_id: postComment.post_id,
        parent_id: postComment.parent_id,
        user_id: postComment.user_id,
        status: postComment.status,
      })
      .from(postComment)
      .where(eq(postComment.id, args.parent_id))
      .limit(1)

    if (!parent) {
      throw ApiError.notFound(
        "community.parent_not_found",
        "Comment you're replying to no longer exists.",
      )
    }
    if (parent.post_id !== args.post_id) {
      throw ApiError.badRequest(
        "community.parent_post_mismatch",
        "Reply target belongs to a different post.",
      )
    }
    if (parent.parent_id !== null) {
      throw ApiError.badRequest(
        "community.reply_too_deep",
        "Comments only nest one level deep — reply to the top-level comment instead.",
      )
    }
    parent_author_id = parent.user_id
  }

  const [inserted] = await db
    .insert(postComment)
    .values({
      post_id: args.post_id,
      parent_id: args.parent_id ?? null,
      user_id: ctx.userId,
      body: args.body,
      status: "visible",
    })
    .returning({
      id: postComment.id,
      created_at: postComment.created_at,
    })

  if (!inserted) {
    throw ApiError.internal(
      "community.comment_create_failed",
      "Comment could not be saved.",
    )
  }

  const [author] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)

  const comment: CommentRow = {
    id: inserted.id,
    post_id: args.post_id,
    parent_id: args.parent_id ?? null,
    user_id: ctx.userId,
    user_name: author?.name ?? author?.email ?? null,
    body: args.body,
    status: "visible",
    created_at: inserted.created_at.toISOString(),
  }

  return {
    comment,
    post_author_id: post.user_id,
    post_title: post.title,
    parent_author_id,
  }
}

// ─── Delete a comment (author or admin) ─────────────────────────────────────

/**
 * Hard-delete. Author can delete their own; admin can delete any. Top-
 * level deletes cascade-remove replies. Audit row written BEFORE the
 * delete so the snapshot is captured even though the row disappears.
 *
 * The op handler is responsible for setting `isAdmin` correctly — the
 * service trusts the boolean. (Mirrors how addInterest's self-interest
 * guard trusts ctx.userId.)
 */
export async function deleteComment(
  db: Database,
  ctx: CallerContext,
  args: { id: string; isAdmin?: boolean },
): Promise<{ ok: true }> {
  const [snapshot] = await db
    .select({
      id: postComment.id,
      post_id: postComment.post_id,
      user_id: postComment.user_id,
      body: postComment.body,
      parent_id: postComment.parent_id,
    })
    .from(postComment)
    .where(eq(postComment.id, args.id))
    .limit(1)

  if (!snapshot) {
    throw ApiError.notFound(
      "community.comment_not_found",
      "Comment not found.",
    )
  }
  const isOwner = snapshot.user_id === ctx.userId
  if (!isOwner && !args.isAdmin) {
    throw new ApiError({
      status: 403,
      code: "community.forbidden",
      message: "You can only delete your own comments.",
    })
  }

  await db.transaction(async (tx) => {
    const audit = createAudit(tx)
    await audit({
      actorId: ctx.userId,
      action: "community.comment_deleted",
      target: { type: "community_post", id: snapshot.post_id },
      meta: {
        kind: "community.comment_deleted",
        post_id: snapshot.post_id,
        author_id: snapshot.user_id,
        body_snapshot: snapshot.body,
        was_reply: snapshot.parent_id !== null,
      },
      client: auditClient(ctx),
    })
    await tx.delete(postComment).where(eq(postComment.id, args.id))
  })

  return { ok: true }
}

// ─── Admin moderation: hide / restore ───────────────────────────────────────

/**
 * Admin-only — flip status between visible and hidden. The op handler
 * gates this with `permission: "admin"`; the service writes the audit
 * row + status update inside one transaction.
 */
export async function moderateComment(
  db: Database,
  ctx: CallerContext,
  args: { id: string; action: "hide" | "restore" },
): Promise<{ ok: true; status: "visible" | "hidden" }> {
  const [row] = await db
    .select({
      id: postComment.id,
      post_id: postComment.post_id,
      body: postComment.body,
      status: postComment.status,
    })
    .from(postComment)
    .where(eq(postComment.id, args.id))
    .limit(1)

  if (!row) {
    throw ApiError.notFound(
      "community.comment_not_found",
      "Comment not found.",
    )
  }

  const nextStatus = args.action === "hide" ? "hidden" : "visible"
  if (row.status === nextStatus) {
    // No-op — return current state without writing an audit row.
    return { ok: true, status: nextStatus }
  }

  await db.transaction(async (tx) => {
    const audit = createAudit(tx)
    if (args.action === "hide") {
      await audit({
        actorId: ctx.userId,
        action: "community.comment_hidden",
        target: { type: "community_post", id: row.post_id },
        meta: {
          kind: "community.comment_hidden",
          post_id: row.post_id,
          body_snapshot: row.body,
        },
        client: auditClient(ctx),
      })
    } else {
      await audit({
        actorId: ctx.userId,
        action: "community.comment_restored",
        target: { type: "community_post", id: row.post_id },
        meta: {
          kind: "community.comment_restored",
          post_id: row.post_id,
        },
        client: auditClient(ctx),
      })
    }
    await tx
      .update(postComment)
      .set({ status: nextStatus })
      .where(eq(postComment.id, args.id))
  })

  return { ok: true, status: nextStatus }
}

