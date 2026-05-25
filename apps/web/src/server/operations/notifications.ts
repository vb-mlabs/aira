import "server-only"

// Notifications operations. Domain file: defines the wire contracts (input
// + output schemas) and binds them to the corresponding service function.
// Route handlers and Server Actions consume operations from this file.

import { z } from "zod"
import { notifications } from "@mlabs/services"
import { defineOperation } from "./index"

const MarkResultSchema = z.object({
  ok: z.literal(true),
  changed: z.number().int().nonnegative(),
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
