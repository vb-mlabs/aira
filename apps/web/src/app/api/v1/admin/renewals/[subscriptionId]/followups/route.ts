// /api/v1/admin/renewals/[subscriptionId]/followups — F23′ per-subscription
// follow-up actions.
//
// GET — list the recent attempt history for one subscription (modal
//       history panel).
// POST — record one outcome row. Body fields:
//         outcome: called | voicemail | no_answer | refused | paid | reschedule
//         note?: string                 (required for 'called')
//         scheduleDays?: number         (required for 'reschedule', 1-60;
//                                        forbidden otherwise)

import {
  createFollowupOp,
  listFollowupHistoryOp,
} from "@/server/operations/subscription-followups"

export const runtime = "nodejs"

export const GET = listFollowupHistoryOp.runFromRequest
export const POST = createFollowupOp.runFromRequest
