// DELETE /api/v1/admin/waitlist/[id] — admin-only hard-delete of one
// pre-launch waitlist row. Audit + delete share one transaction; a
// failed audit rolls the delete back. 404 when the id no longer
// exists (race-safe — two admins deleting the same row).

import { deleteWaitlistEntryOp } from "@/server/operations/waitlist-admin"

export const runtime = "nodejs"

export const DELETE = deleteWaitlistEntryOp.runFromRequest
