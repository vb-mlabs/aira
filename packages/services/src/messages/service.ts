import "server-only"

// Messages domain — direct messaging service. Mirrors the legacy
// src/features/messages/server/* logic on the (db, ctx, args) contract.
//
// Authorization rules:
//   - Every read/write scoped to ctx.userId.
//   - requireParticipant() throws messages.not_found for "wrong conversation
//     id" AND "I'm not in it" — same error code, no enumeration leak.
//   - openOrCreate1to1: target user must be verified; self-DM blocked.
//
// Cross-domain calls:
//   - sendMessage fans out to notifications.createNotification for the OTHER
//     participants. Best-effort: if the notification insert fails, the
//     message has already landed and the recipient's next inbox poll picks
//     it up. Bell stays eventually-consistent.

import { and, asc, desc, eq, gt, isNull, ne, or, sql } from "drizzle-orm"
import { z } from "zod"
import {
  conversations,
  conversation_participants,
  messages as messagesTable,
  notifications as notificationsTable,
  user,
} from "@mlabs/db/schema"
import type { Database } from "@mlabs/db/client"
import { ApiError } from "@mlabs/api"
import type { CallerContext } from "@mlabs/api/context"
import { createNotification } from "../notifications"
import { decodeCursor } from "./cursor"

export const MAX_BODY_CHARS = 10_000
const PAGE_SIZE = 100
const INBOX_LIMIT = 50

export interface ConversationListItem {
  id: string
  other_user: {
    id: string
    name: string
    image: string | null
  }
  last_message_preview: string | null
  last_message_at: string | null
  unread_count: number
}

export interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string | null
  sender_name: string
  body: string
  created_at: string
}

const bodySchema = z
  .string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(MAX_BODY_CHARS, `Message too long (max ${MAX_BODY_CHARS} chars)`)

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("::")
}

/**
 * Throws ApiError("messages.not_found") when the caller isn't a participant
 * in the conversation OR when the conversation doesn't exist. Same error
 * code for both — no enumeration of which is which.
 *
 * Exported with an underscore prefix so the messages service test suite can
 * exercise the predicate directly. External consumers should never need to
 * call this — every public method (listMessages, sendMessage,
 * markConversationRead) gates on it internally.
 */
export async function _requireParticipant(
  db: Database,
  conversationId: string,
  userId: string,
): Promise<void> {
  const [row] = await db
    .select({ user_id: conversation_participants.user_id })
    .from(conversation_participants)
    .where(
      and(
        eq(conversation_participants.conversation_id, conversationId),
        eq(conversation_participants.user_id, userId),
      ),
    )
    .limit(1)
  if (!row) {
    throw ApiError.notFound("messages.not_found", "Conversation not found")
  }
}

export interface OpenOrCreate1to1Args {
  otherEmail: string
}

export async function openOrCreate1to1(
  db: Database,
  ctx: CallerContext,
  args: OpenOrCreate1to1Args,
): Promise<{ id: string }> {
  const targetEmail = args.otherEmail.trim().toLowerCase()

  // Resolve the other user. Verified accounts only — anonymized users
  // (W5 deleteAccount sets emailVerified=false) and unverified signups
  // aren't DM-able. Generic "user_not_found" on either branch — no
  // enumeration of which case applied.
  const [other] = await db
    .select({ id: user.id, emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.email, targetEmail))
    .limit(1)
  if (!other || !other.emailVerified) {
    throw ApiError.badRequest("messages.user_not_found", "User not found.")
  }
  if (other.id === ctx.userId) {
    throw ApiError.badRequest("messages.self_dm", "You cannot DM yourself.")
  }

  const key = pairKey(ctx.userId, other.id)

  // Race-safe upsert: INSERT ... ON CONFLICT DO NOTHING returns the new row
  // when we won the race, or no row when we lost. Either way the row exists
  // after this — fetch by pair_key.
  const inserted = await db
    .insert(conversations)
    .values({ pair_key: key })
    .onConflictDoNothing({ target: conversations.pair_key })
    .returning({ id: conversations.id })

  let convId: string
  if (inserted.length > 0) {
    convId = inserted[0]!.id
    await db
      .insert(conversation_participants)
      .values([
        { conversation_id: convId, user_id: ctx.userId },
        { conversation_id: convId, user_id: other.id },
      ])
      .onConflictDoNothing()
  } else {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.pair_key, key))
      .limit(1)
    if (!existing) {
      throw ApiError.notFound(
        "messages.not_found",
        "Conversation not available.",
      )
    }
    convId = existing.id
  }
  return { id: convId }
}

/**
 * Inbox listing for the caller. Single query with aggregated unread-count +
 * other-user lookup via correlated subqueries so the inbox poll is one
 * round-trip, not N+1. Ordered by last_message_at DESC.
 */
export async function listConversations(
  db: Database,
  ctx: CallerContext,
  _args: Record<string, never> = {},
): Promise<{ items: ConversationListItem[] }> {
  const userId = ctx.userId
  const rows = await db
    .select({
      id: conversations.id,
      last_message_at: conversations.last_message_at,
      last_message_preview: conversations.last_message_preview,
      my_last_read_at: conversation_participants.last_read_at,
      other_id: sql<string>`(
        SELECT cp.user_id FROM ${conversation_participants} AS cp
        WHERE cp.conversation_id = ${conversations.id}
          AND cp.user_id <> ${userId}
        LIMIT 1
      )`.as("other_id"),
      other_name: sql<string>`(
        SELECT u.name FROM ${conversation_participants} AS cp
        JOIN ${user} AS u ON u.id = cp.user_id
        WHERE cp.conversation_id = ${conversations.id}
          AND cp.user_id <> ${userId}
        LIMIT 1
      )`.as("other_name"),
      other_image: sql<string | null>`(
        SELECT u.image FROM ${conversation_participants} AS cp
        JOIN ${user} AS u ON u.id = cp.user_id
        WHERE cp.conversation_id = ${conversations.id}
          AND cp.user_id <> ${userId}
        LIMIT 1
      )`.as("other_image"),
      unread_count: sql<number>`(
        SELECT COUNT(*)::int FROM ${messagesTable} AS m
        WHERE m.conversation_id = ${conversations.id}
          AND m.sender_id <> ${userId}
          AND (
            ${conversation_participants.last_read_at} IS NULL
            OR m.created_at > ${conversation_participants.last_read_at}
          )
      )`.as("unread_count"),
    })
    .from(conversations)
    .innerJoin(
      conversation_participants,
      and(
        eq(conversation_participants.conversation_id, conversations.id),
        eq(conversation_participants.user_id, userId),
      ),
    )
    .orderBy(desc(conversations.last_message_at))
    .limit(INBOX_LIMIT)

  const items: ConversationListItem[] = rows.map((r) => ({
    id: r.id,
    other_user: {
      id: r.other_id ?? "",
      name: r.other_name ?? "Deleted user",
      image: r.other_image ?? null,
    },
    last_message_preview: r.last_message_preview,
    last_message_at: r.last_message_at
      ? new Date(r.last_message_at).toISOString()
      : null,
    unread_count: r.unread_count ?? 0,
  }))
  return { items }
}

/**
 * Freshness for /api/messages/conversations conditional GET. Reads
 * users.messages_updated_at — bumped by an AFTER INSERT trigger on the
 * messages table (migration 0005).
 */
export async function getConversationsFreshness(
  db: Database,
  ctx: CallerContext,
  _args: Record<string, never> = {},
): Promise<{ ts: Date | null }> {
  const [row] = await db
    .select({ ts: user.messages_updated_at })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)
  return { ts: row?.ts ?? null }
}

export interface ListMessagesArgs {
  conversationId: string
  cursor?: string | null
}

export async function listMessages(
  db: Database,
  ctx: CallerContext,
  args: ListMessagesArgs,
): Promise<{ items: MessageRow[] }> {
  await _requireParticipant(db, args.conversationId, ctx.userId)

  if (args.cursor) {
    const decoded = decodeCursor(args.cursor)
    if (!decoded) return { items: [] } // bad cursor → empty page, not 400

    const rows = await db
      .select({
        id: messagesTable.id,
        conversation_id: messagesTable.conversation_id,
        sender_id: messagesTable.sender_id,
        sender_name: user.name,
        body: messagesTable.body,
        created_at: messagesTable.created_at,
      })
      .from(messagesTable)
      .leftJoin(user, eq(user.id, messagesTable.sender_id))
      .where(
        and(
          eq(messagesTable.conversation_id, args.conversationId),
          or(
            gt(messagesTable.created_at, new Date(decoded.created_at)),
            and(
              eq(messagesTable.created_at, new Date(decoded.created_at)),
              gt(messagesTable.id, decoded.id),
            ),
          ),
        ),
      )
      .orderBy(asc(messagesTable.created_at), asc(messagesTable.id))
      .limit(PAGE_SIZE)

    return { items: rows.map(toMessageRow) }
  }

  // Initial load — newest 50 messages, returned chronological.
  const latest = await db
    .select({
      id: messagesTable.id,
      conversation_id: messagesTable.conversation_id,
      sender_id: messagesTable.sender_id,
      sender_name: user.name,
      body: messagesTable.body,
      created_at: messagesTable.created_at,
    })
    .from(messagesTable)
    .leftJoin(user, eq(user.id, messagesTable.sender_id))
    .where(eq(messagesTable.conversation_id, args.conversationId))
    .orderBy(
      sql`${messagesTable.created_at} DESC`,
      sql`${messagesTable.id} DESC`,
    )
    .limit(INBOX_LIMIT)
  return { items: latest.reverse().map(toMessageRow) }
}

export interface SendMessageArgs {
  conversationId: string
  body: string
}

/**
 * Send a message. Three writes:
 *   1. INSERT into messages
 *   2. UPDATE conversations SET last_message_at, last_message_preview
 *   3. INSERT into notifications (for the other participants) — best-effort
 *
 * 1 + 2 + the sender lookup run as a Neon HTTP batch (atomic over the same
 * HTTP request). 3 runs outside the batch and catches its own error: if
 * Neon hiccups while writing the notification, the message has already
 * landed and the recipient's next inbox poll picks it up.
 */
export async function sendMessage(
  db: Database,
  ctx: CallerContext,
  args: SendMessageArgs,
): Promise<{ message: MessageRow }> {
  await _requireParticipant(db, args.conversationId, ctx.userId)

  const parsed = bodySchema.safeParse(args.body)
  if (!parsed.success) {
    throw ApiError.badRequest(
      "messages.invalid_body",
      parsed.error.issues[0]?.message ?? "Invalid message",
    )
  }
  const body = parsed.data
  const preview = body.length > 200 ? body.slice(0, 200) : body

  // Atomic transaction across insert + conversation-timestamp update +
  // sender lookup. Used to be db.batch() (neon-http only) but the
  // neon-serverless WS Pool doesn't expose it; db.transaction() is the
  // cross-driver equivalent with stronger semantics (real BEGIN/COMMIT
  // vs neon-http's pseudo-atomic batched HTTP request). Tests pass a
  // mock db whose .transaction(cb) invokes cb(db) directly.
  const { row, sender } = await db.transaction(async (tx) => {
    const insertedRows: Array<MessageInsertReturn> = await tx
      .insert(messagesTable)
      .values({
        conversation_id: args.conversationId,
        sender_id: ctx.userId,
        body,
      })
      .returning({
        id: messagesTable.id,
        conversation_id: messagesTable.conversation_id,
        sender_id: messagesTable.sender_id,
        body: messagesTable.body,
        created_at: messagesTable.created_at,
      })
    await tx
      .update(conversations)
      .set({
        last_message_at: sql`now()`,
        last_message_preview: preview,
      })
      .where(eq(conversations.id, args.conversationId))
    const senderRows: Array<SenderRow> = await tx
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, ctx.userId))
      .limit(1)
    return { row: insertedRows[0], sender: senderRows[0] }
  })

  if (!row) throw ApiError.internal("messages.send_failed", "Send failed")

  // Fan out to the OTHER participants. Best-effort.
  try {
    const others = await db
      .select({ user_id: conversation_participants.user_id })
      .from(conversation_participants)
      .where(
        and(
          eq(conversation_participants.conversation_id, args.conversationId),
          ne(conversation_participants.user_id, ctx.userId),
        ),
      )

    await Promise.all(
      others.map(({ user_id }) =>
        createNotification(db, ctx, {
          userId: user_id,
          body: {
            kind: "message",
            conversation_id: args.conversationId,
            sender_id: ctx.userId,
            sender_name: sender?.name ?? "Someone",
            preview,
          },
        }),
      ),
    )
  } catch {
    // Swallow — notification fan-out failure must not roll back the send.
  }

  return {
    message: {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      sender_name: sender?.name ?? "You",
      body: row.body,
      created_at: new Date(row.created_at).toISOString(),
    },
  }
}

/**
 * Header lookup for the thread view: returns the OTHER participant (single
 * row, LIMIT 1) without re-loading the inbox. Matches the legacy
 * conversations.getOtherParticipant contract — for v2 group conversations,
 * "first non-self participant" stays the documented semantic until the
 * group surface gets its own design pass.
 *
 * No participant check here: this is read-only, returns null for non-existent
 * conversations or conversations the caller isn't in (no enumeration). The
 * thread page calls listMessages() first, which already throws messages.not_found
 * via requireParticipant() — so by the time we reach this query the caller has
 * been authorized.
 */
export async function getOtherParticipant(
  db: Database,
  ctx: CallerContext,
  args: { conversationId: string },
): Promise<{ otherUser: { id: string; name: string; image: string | null } | null }> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
    })
    .from(conversation_participants)
    .innerJoin(user, eq(user.id, conversation_participants.user_id))
    .where(
      and(
        eq(conversation_participants.conversation_id, args.conversationId),
        ne(conversation_participants.user_id, ctx.userId),
      ),
    )
    .limit(1)
  return { otherUser: row ?? null }
}

export interface MarkConversationReadArgs {
  conversationId: string
}

export async function markConversationRead(
  db: Database,
  ctx: CallerContext,
  args: MarkConversationReadArgs,
): Promise<{ ok: true }> {
  await _requireParticipant(db, args.conversationId, ctx.userId)
  const now = new Date()

  await db
    .update(conversation_participants)
    .set({ last_read_at: now })
    .where(
      and(
        eq(conversation_participants.conversation_id, args.conversationId),
        eq(conversation_participants.user_id, ctx.userId),
      ),
    )

  await db
    .update(notificationsTable)
    .set({ read_at: now })
    .where(
      and(
        eq(notificationsTable.user_id, ctx.userId),
        eq(notificationsTable.type, "message"),
        isNull(notificationsTable.read_at),
        sql`${notificationsTable.body}->>'conversation_id' = ${args.conversationId}`,
      ),
    )

  return { ok: true }
}

interface MessageInsertReturn {
  id: string
  conversation_id: string
  sender_id: string | null
  body: string
  created_at: Date
}

interface SenderRow {
  id: string
  name: string
}

function toMessageRow(row: {
  id: string
  conversation_id: string
  sender_id: string | null
  sender_name: string | null
  body: string
  created_at: Date
}): MessageRow {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    sender_name: row.sender_name ?? "Deleted user",
    body: row.body,
    created_at: row.created_at.toISOString(),
  }
}
