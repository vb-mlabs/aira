// POST /api/v1/profile/email { email }
//
// Starts a Better Auth email-change flow: audits user.email_changed (with
// hashed previous email) BEFORE handing off, then calls auth.api.changeEmail
// which mails a confirmation link to the CURRENT address. The change only
// completes once the user clicks that link — this endpoint just kicks it off.
//
// Returns { ok: true, changed: false } when the new email matches the
// current one (no-op short-circuit); UI uses `changed` to pick its toast.

import { requestEmailChangeOp } from "@/server/operations/users"

export const runtime = "nodejs"

export const POST = requestEmailChangeOp.runFromRequest
