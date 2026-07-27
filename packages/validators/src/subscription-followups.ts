// F23′ Admin renewal follow-up queue — shared shape between web RSC,
// web Client Components, and the /api/v1/admin/renewals route
// handlers. (Mobile would consume the same schemas if/when an admin
// shell ever ships on Expo; for now this is web-only by design.)

import { z } from "zod";

export const FOLLOWUP_OUTCOMES = [
  "called",
  "voicemail",
  "no_answer",
  "refused",
  "paid",
  "reschedule",
] as const;
export type FollowupOutcome = (typeof FOLLOWUP_OUTCOMES)[number];
export const FollowupOutcomeSchema = z.enum(FOLLOWUP_OUTCOMES);

/** Note enforcement bounds. The 'called' outcome requires a non-empty
 *  note (the note IS the value of the call). All other outcomes leave
 *  the note optional. Cap matches business_subscription.notes shape. */
export const FOLLOWUP_NOTE_MAX = 500;

/** Reschedule cap = 60 days. Beyond that the subscription has almost
 *  certainly already expired. Per 2026-06-15 review Decision 3. */
export const FOLLOWUP_SCHEDULE_DAYS_MIN = 1;
export const FOLLOWUP_SCHEDULE_DAYS_MAX = 60;

/** Latest-attempt summary embedded into each queue row. Sourced from
 *  the correlated subquery in subscriptionFollowups.listQueue. */
export const FollowupLatestSchema = z.object({
  outcome: FollowupOutcomeSchema.nullable(),
  created_at: z.string().nullable(),
  scheduled_next: z.string().nullable(),
});
export type FollowupLatest = z.infer<typeof FollowupLatestSchema>;

/** One row of the renewals queue — superset of `RenewingSoonRow` shape
 *  with the latest-attempt fields appended. */
export const FollowupQueueRowSchema = z.object({
  subscription_id: z.string(),
  business_id: z.string(),
  business_name: z.string(),
  plan_name: z.string().nullable(),
  payment_status: z.enum(["paid", "pending", "overdue"]),
  end_date: z.string(),
  days_remaining: z.number().int(),
  contact_phone: z.string().nullable(),
  contact_whatsapp: z.string().nullable(),
  last_outcome: FollowupOutcomeSchema.nullable(),
  last_followup_at: z.string().nullable(),
  scheduled_next: z.string().nullable(),
});
export type FollowupQueueRow = z.infer<typeof FollowupQueueRowSchema>;

/** GET /api/v1/admin/renewals/queue.
 *
 *  `includeAll` uses a `z.enum(["0","1"]).transform(...)` rather than
 *  `z.coerce.boolean()` because the latter parses ANY non-empty string
 *  as truthy (including "false", "0", "no"). The chip on the page emits
 *  exactly `1` on active state and drops the param on inactive; the
 *  enum accepts precisely that. Matches the `?archived=1` idiom in
 *  apps/web/src/app/admin/businesses/page.tsx. */
export const FollowupQueueInputSchema = z
  .object({
    withinDays: z.coerce.number().int().min(1).max(365).optional(),
    includeAll: z
      .enum(["0", "1"])
      .optional()
      .transform((v) => v === "1"),
  })
  .strict();
export type FollowupQueueInput = z.infer<typeof FollowupQueueInputSchema>;

export const FollowupQueueOutputSchema = z.object({
  items: z.array(FollowupQueueRowSchema),
  total: z.number().int().nonnegative(),
  withinDays: z.number().int().min(1).max(365),
});
export type FollowupQueueOutput = z.infer<typeof FollowupQueueOutputSchema>;

/** One row in a subscription's followup history (used in the modal's
 *  recent-attempts panel). */
export const FollowupHistoryRowSchema = z.object({
  id: z.string(),
  outcome: FollowupOutcomeSchema,
  note: z.string().nullable(),
  scheduled_next: z.string().nullable(),
  actor_id: z.string().nullable(),
  actor_email: z.string().nullable(),
  created_at: z.string(),
});
export type FollowupHistoryRow = z.infer<typeof FollowupHistoryRowSchema>;

export const FollowupHistoryOutputSchema = z.object({
  items: z.array(FollowupHistoryRowSchema),
});
export type FollowupHistoryOutput = z.infer<typeof FollowupHistoryOutputSchema>;

/** POST body for /api/v1/admin/renewals/[subscriptionId]/followups.
 *
 *  Conditional rules enforced via superRefine — Zod can't express
 *  "field A required iff field B has value X" inside the object schema
 *  itself:
 *    - outcome === "called"     → note must be a non-empty string
 *    - outcome === "reschedule" → scheduleDays in [1, 60]
 *    - outcome !== "reschedule" → scheduleDays must be undefined
 */
export const CreateFollowupInputSchema = z
  .object({
    subscriptionId: z.string().min(1),
    outcome: FollowupOutcomeSchema,
    note: z
      .string()
      .max(
        FOLLOWUP_NOTE_MAX,
        `Note must be ${FOLLOWUP_NOTE_MAX} characters or fewer.`,
      )
      .optional(),
    scheduleDays: z
      .number()
      .int()
      .min(FOLLOWUP_SCHEDULE_DAYS_MIN)
      .max(FOLLOWUP_SCHEDULE_DAYS_MAX)
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.outcome === "called") {
      const trimmed = data.note?.trim() ?? "";
      if (trimmed.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["note"],
          message:
            "A note is required when you mark the call as 'called' — capture what was said.",
        });
      }
    }
    if (data.outcome === "reschedule") {
      if (data.scheduleDays === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduleDays"],
          message: `Pick how many days to wait (1-${FOLLOWUP_SCHEDULE_DAYS_MAX}) before reminding yourself.`,
        });
      }
    } else if (data.scheduleDays !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduleDays"],
        message: `scheduleDays only applies when outcome is 'reschedule'.`,
      });
    }
  });
export type CreateFollowupInput = z.infer<typeof CreateFollowupInputSchema>;

export const CreateFollowupOutputSchema = z.object({
  id: z.string(),
});
export type CreateFollowupOutput = z.infer<typeof CreateFollowupOutputSchema>;
