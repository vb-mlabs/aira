import "server-only"

// Notifications domain — pure service functions. Every entry point follows
// the locked (db, ctx, args) shape so the operation adapter (or any other
// caller — tests, scripts, future cron) can compose them without touching
// globals.
//
// Authorization rule: scoping by ctx.userId is the implicit ACL. There is no
// notion of "read someone else's notification" — those queries don't exist
// in this surface. Admin-side analytics live in @mlabs/services/audit (when
// it exists), not here.

import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { notifications, user } from "@mlabs/db/schema"
import type { NotificationBody } from "@mlabs/db/types"
import type { Database } from "@mlabs/db/client"
import type { CallerContext } from "@mlabs/api/context"

/** Public row shape — what services return to callers. Drizzle's row type
 *  carries column metadata we don't want to leak through the operation
 *  adapter; we project explicitly. */
export interface NotificationRow {
  id: string
  type: string
  body: NotificationBody
  read_at: Date | null
  created_at: Date
}

export interface MarkResult {
  ok: true
  changed: number
}

export const INBOX_LIMIT = 50

/**
 * Freshness timestamp for conditional-GET on /api/notifications/unread-count
 * (Phase 5.5 A5). Reads users.notifications_updated_at — the column is
 * maintained by an AFTER INSERT trigger on notifications (migration 0005),
 * so the timestamp can never get ahead of the actual row.
 *
 * The cross-table read (notifications service touching user table) is
 * intentional: the freshness signal is denormalized onto user precisely so
 * the bell poll never scans notifications. Keeping the read in this domain
 * means the route doesn't have to know about that denormalization.
 */
export async function getFreshness(
  db: Database,
  ctx: CallerContext,
  _args: Record<string, never> = {},
): Promise<{ ts: Date | null }> {
  const [row] = await db
    .select({ ts: user.notifications_updated_at })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)
  return { ts: row?.ts ?? null }
}

export async function getUnreadCount(
  db: Database,
  ctx: CallerContext,
  _args: Record<string, never> = {},
): Promise<{ count: number }> {
  // Single-row count using the (user_id, read_at) index — sub-ms hot path
  // (called by the bell every poll).
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.user_id, ctx.userId),
        isNull(notifications.read_at),
      ),
    )
  return { count: row?.count ?? 0 }
}

export async function listInbox(
  db: Database,
  ctx: CallerContext,
  _args: Record<string, never> = {},
): Promise<{ rows: NotificationRow[] }> {
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      body: notifications.body,
      read_at: notifications.read_at,
      created_at: notifications.created_at,
    })
    .from(notifications)
    .where(eq(notifications.user_id, ctx.userId))
    .orderBy(desc(notifications.created_at))
    .limit(INBOX_LIMIT)
  return { rows }
}

export async function markAllRead(
  db: Database,
  ctx: CallerContext,
  _args: Record<string, never> = {},
): Promise<MarkResult> {
  const rows = await db
    .update(notifications)
    .set({ read_at: new Date() })
    .where(
      and(
        eq(notifications.user_id, ctx.userId),
        isNull(notifications.read_at),
      ),
    )
    .returning({ id: notifications.id })
  return { ok: true, changed: rows.length }
}

export async function markRead(
  db: Database,
  ctx: CallerContext,
  args: { id: string },
): Promise<MarkResult> {
  // Authz model — no enumeration: update predicate scopes to (id, user_id).
  // If 0 rows match (bogus id OR not yours OR already read), we return
  // { changed: 0 } — never "forbidden", never "not found". An attacker
  // probing IDs sees the same response for "doesn't exist" and "exists
  // but not yours".
  const rows = await db
    .update(notifications)
    .set({ read_at: new Date() })
    .where(
      and(
        eq(notifications.id, args.id),
        eq(notifications.user_id, ctx.userId),
        isNull(notifications.read_at),
      ),
    )
    .returning({ id: notifications.id })
  return { ok: true, changed: rows.length }
}

export interface CreateNotificationArgs {
  /** Recipient user id. Caller is responsible for authorization (e.g. only
   *  admin actions, message-reply hooks, or trusted system events can
   *  notify arbitrary users — services that wrap createNotification must
   *  enforce their own rules first). */
  userId: string
  body: NotificationBody
}

export async function createNotification(
  db: Database,
  _ctx: CallerContext,
  args: CreateNotificationArgs,
): Promise<{ id: string }> {
  // type column mirrors body.kind for cheap SQL-side filtering — keep them
  // in lockstep here so no caller can drift.
  const [row] = await db
    .insert(notifications)
    .values({
      user_id: args.userId,
      type: args.body.kind,
      body: args.body,
    })
    .returning({ id: notifications.id })

  if (!row) {
    throw new Error("createNotification: insert returned no row")
  }
  return { id: row.id }
}
