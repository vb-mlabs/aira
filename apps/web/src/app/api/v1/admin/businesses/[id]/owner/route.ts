// POST   /api/v1/admin/businesses/[id]/owner  { owner_user_id }  — assign
// DELETE /api/v1/admin/businesses/[id]/owner                       — unassign
//
// Admin-only. Assignment audits + writes the FK + fires the in-app
// notification inside the service, then the op layer fires the link-event
// email best-effort. Unassign is idempotent and emails nothing. POST is
// used for assign (rather than PUT) to match the rest of /api/v1/admin/*
// — every mutating admin endpoint in this app uses POST.

import {
  assignBusinessOwnerOp,
  unassignBusinessOwnerOp,
} from "@/server/operations/businesses-admin"

export const runtime = "nodejs"

export const POST = assignBusinessOwnerOp.runFromRequest
export const DELETE = unassignBusinessOwnerOp.runFromRequest
