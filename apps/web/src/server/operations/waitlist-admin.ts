import "server-only"

// Admin operations for the pre-launch waitlist. Read + hard-delete only.
// The marketing capture endpoint (/api/v1/waitlist, /api/v1/business-waitlist)
// remains the only writer.

import { z } from "zod"
import { waitlist as service } from "@aira/services"
import {
  WaitlistAdminCountsOutputSchema,
  WaitlistAdminListInputSchema,
  WaitlistAdminListOutputSchema,
} from "@aira/validators"
import { defineOperation } from "./index"

export const listWaitlistOp = defineOperation({
  name: "admin.waitlist.list",
  input: WaitlistAdminListInputSchema,
  output: WaitlistAdminListOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, input) => {
    return service.listAdmin(db, { type: input.type })
  },
})

export const getWaitlistCountsOp = defineOperation({
  name: "admin.waitlist.counts",
  input: z.object({}).strict(),
  output: WaitlistAdminCountsOutputSchema,
  permission: "admin",
  handler: async (db) => {
    return service.getCounts(db)
  },
})

export const deleteWaitlistEntryOp = defineOperation({
  name: "admin.waitlist.delete",
  // Route: DELETE /api/v1/admin/waitlist/[id]
  // runFromRequest merges the [id] path param into the input.
  input: z.object({ id: z.string().min(1) }).strict(),
  output: z.object({ ok: z.literal(true) }),
  permission: "admin",
  handler: async (db, ctx, input) => {
    return service.deleteWaitlistEntry(db, ctx, { id: input.id })
  },
})
