// /api/v1/admin/renewals/queue — F23′ renewal follow-up queue.
//
// GET supports ?withinDays=N (1-365, default 30). Returns the derived
// view: subscriptions whose end_date is inside the window and whose
// latest followup neither marks them paid nor reschedules them past
// now(). Capped at 100; total reports the unbounded count for the
// "showing 100 of N" hint.

import { listFollowupQueueOp } from "@/server/operations/subscription-followups"

export const runtime = "nodejs"

export const GET = listFollowupQueueOp.runFromRequest
