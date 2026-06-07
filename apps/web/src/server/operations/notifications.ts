import "server-only"

// Notifications operations. Domain file: defines the wire contracts (input
// + output schemas) and binds them to the corresponding service function.
// Route handlers and Server Actions consume operations from this file.

import { z } from "zod"
import { notifications } from "@aira/services"
import {
  ListInboxInputSchema,
  ListInboxOutputSchema,
} from "@aira/validators/notifications"
import { defineOperation } from "./index"

const MarkResultSchema = z.object({
  ok: z.literal(true),
  changed: z.number().int().nonnegative(),
})

export const listInboxOp = defineOperation({
  name: "notifications.listInbox",
  input: ListInboxInputSchema,
  output: ListInboxOutputSchema,
  permission: "user",
  handler: async (db, ctx) => {
    const { rows } = await notifications.listInbox(db, ctx)
    // Project Date fields to ISO strings at the wire boundary so web RSC,
    // web Client Components, and mobile all consume the same shape.
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        body: r.body,
        read_at: r.read_at ? r.read_at.toISOString() : null,
        created_at: r.created_at.toISOString(),
      })),
    }
  },
})

export const markAllReadOp = defineOperation({
  name: "notifications.markAllRead",
  input: z.object({}).strict(),
  output: MarkResultSchema,
  permission: "user",
  handler: async (db, ctx) => notifications.markAllRead(db, ctx),
})

export const markReadOp = defineOperation({
  name: "notifications.markRead",
  input: z.object({ id: z.string().min(1) }),
  output: MarkResultSchema,
  permission: "user",
  handler: async (db, ctx, { id }) => notifications.markRead(db, ctx, { id }),
})
