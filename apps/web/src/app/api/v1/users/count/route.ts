// /api/v1/users/count — community-members count for the /home stat card.
//
// Auth: required (cookie on web, bearer on mobile). The op enforces this
// via permission: "user". Definition of "community member" lives in the
// service — see packages/services/src/users/queries.ts.

import { countCommunityMembersOp } from "@/server/operations/users"

export const runtime = "nodejs"

export const GET = countCommunityMembersOp.runFromRequest
