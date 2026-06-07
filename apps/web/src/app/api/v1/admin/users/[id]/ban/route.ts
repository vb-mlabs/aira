// POST /api/v1/admin/users/[id]/ban  { reason? }
//
// Op handles audit + the user_ban row. [id] is auto-merged onto the op's
// `id` input field via defineOperation's path-param handling.

import { banUserOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const POST = banUserOp.runFromRequest
