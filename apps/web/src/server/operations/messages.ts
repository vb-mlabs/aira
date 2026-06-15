import "server-only"

// Messages operations. POST routes go through these. The HTTP GET surfaces
// (inbox list + thread) stay route-direct so the If-Modified-Since 304
// short-circuit can run before the heavy aggregation queries.
//
// listConversationsOp + listMessagesOp + getOtherParticipantOp are
// in-process-only: they have no /api/v1/* route export, only an apiServerFetch
// callsite from the RSC pages. Mobile + the polling Client Components keep
// using the existing service-direct routes that emit 304. The op layer here
// covers the RSC reads so apps/web/src/app/(app)/messages/**/page.tsx doesn't
// have to import @aira/services directly (CLAUDE.md "API surface" rule).

import { z } from "zod"
import { messages } from "@aira/services"
import { sendNotificationEmail, buildAppLinkUrl } from "@/lib/email"
import { logger } from "@/lib/logger"
import { defineOperation } from "./index"

const MESSAGE_PREVIEW_CHARS = 200

const ConversationIdSchema = z.object({ id: z.string().min(1) })

const MessageRowSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  sender_id: z.string().nullable(),
  sender_name: z.string(),
  body: z.string(),
  created_at: z.string(),
})

const ConversationListItemSchema = z.object({
  id: z.string(),
  other_user: z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().nullable(),
  }),
  last_message_preview: z.string().nullable(),
  last_message_at: z.string().nullable(),
  unread_count: z.number().int().nonnegative(),
})

export const listConversationsOp = defineOperation({
  name: "messages.listConversations",
  input: z.object({}).strict(),
  output: z.object({ items: z.array(ConversationListItemSchema) }),
  permission: "user",
  handler: async (db, ctx) => messages.listConversations(db, ctx),
})

export const listMessagesOp = defineOperation({
  name: "messages.listMessages",
  input: ConversationIdSchema,
  output: z.object({ items: z.array(MessageRowSchema) }),
  permission: "user",
  handler: async (db, ctx, { id }) =>
    messages.listMessages(db, ctx, { conversationId: id }),
})

export const getOtherParticipantOp = defineOperation({
  name: "messages.getOtherParticipant",
  input: ConversationIdSchema,
  output: z.object({
    otherUser: z
      .object({
        id: z.string(),
        name: z.string(),
        image: z.string().nullable(),
      })
      .nullable(),
  }),
  permission: "user",
  handler: async (db, ctx, { id }) =>
    messages.getOtherParticipant(db, ctx, { conversationId: id }),
})

export const openOrCreate1to1Op = defineOperation({
  name: "messages.openOrCreate1to1",
  input: z.object({
    otherEmail: z.email("Enter a valid email"),
  }),
  output: z.object({ id: z.string() }),
  permission: "user",
  handler: async (db, ctx, args) => messages.openOrCreate1to1(db, ctx, args),
})

export const markConversationReadOp = defineOperation({
  name: "messages.markConversationRead",
  input: ConversationIdSchema,
  output: z.object({ ok: z.literal(true) }),
  permission: "user",
  handler: async (db, ctx, { id }) =>
    messages.markConversationRead(db, ctx, { conversationId: id }),
})

export const sendMessageOp = defineOperation({
  name: "messages.send",
  input: z.object({
    id: z.string().min(1),
    body: z.string(),
  }),
  output: z.object({ message: MessageRowSchema }),
  permission: "user",
  handler: async (db, ctx, { id, body }) => {
    const result = await messages.sendMessage(db, ctx, {
      conversationId: id,
      body,
    })

    // After the send commits, fan out emails to recipients who haven't
    // opted out. Each send is best-effort: a Postmark hiccup or
    // mis-rendered template must NOT bubble up to the API caller — the
    // message has already landed and the in-app notification has
    // already fired. error_log meta strips PII (no body / preview /
    // sender name beyond the kind discriminator).
    try {
      const recipients = await messages.listMessageRecipientsForEmail(
        db,
        id,
        ctx.userId,
      )
      const preview =
        result.message.body.length > MESSAGE_PREVIEW_CHARS
          ? result.message.body.slice(0, MESSAGE_PREVIEW_CHARS)
          : result.message.body
      const ctaUrl = buildAppLinkUrl(`/messages/${id}`)
      for (const r of recipients) {
        if (!r.email_on_message_received) continue
        try {
          await sendNotificationEmail({
            to: r.email,
            title: `New message from ${result.message.sender_name}`,
            body: preview,
            ctaLabel: "Open conversation",
            ctaUrl,
          })
        } catch (err) {
          logger.error("email send failed", {
            kind: "email.new_message",
            recipient_user_id: r.user_id,
            message: String(err),
          })
        }
      }
    } catch (err) {
      // Recipient-lookup failure (e.g. DB hiccup) — log and move on.
      logger.error("email recipient lookup failed", {
        kind: "email.new_message",
        message: String(err),
      })
    }

    return result
  },
})
