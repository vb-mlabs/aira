import "server-only"

// Messages operations. POST routes go through these — the two GET surfaces
// (inbox list + thread) stay route-direct so the If-Modified-Since 304
// short-circuit can run before the heavy aggregation queries.

import { z } from "zod"
import { messages } from "@mlabs/services"
import { defineOperation } from "./index"

const ConversationIdSchema = z.object({ id: z.string().min(1) })

const MessageRowSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  sender_id: z.string().nullable(),
  sender_name: z.string(),
  body: z.string(),
  created_at: z.string(),
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
  handler: async (db, ctx, { id, body }) =>
    messages.sendMessage(db, ctx, { conversationId: id, body }),
})
