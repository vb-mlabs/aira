// Waitlist signup contract. Consumed by apps/web's /api/v1/waitlist route
// and the matching marketing-page form component (waitlist-card.tsx).
//
// Pure Zod; no Drizzle (enforced by no-drizzle-in-schemas).
//
// IMPORTANT: The `source` enum values are duplicated as a CHECK constraint
// on the `waitlist.source` column in packages/db/src/schema/waitlist.ts.
// New values must be added in BOTH places. Defense-in-depth — keeps the DB
// honest if a caller ever bypasses Zod.

import { z } from "zod";
import { emailSchema } from "./auth";

/** Capture point. Lives in two places — keep this and the DB CHECK in sync. */
export const WaitlistSourceSchema = z.enum([
  "marketing-hero",
  "marketing-footer",
  "business-mailto",
]);
export type WaitlistSource = z.infer<typeof WaitlistSourceSchema>;

export const WaitlistSignupSchema = z.object({
  email: emailSchema,
  source: WaitlistSourceSchema.default("marketing-hero"),
  /** Honeypot anti-spam. Hidden in the rendered form via CSS so humans
   *  never see it; bots fill every field. The route handler checks this
   *  AFTER Zod parsing and returns 200-silent if non-empty (so bots can't
   *  tell from the response that we trapped them — a Zod max(0) constraint
   *  would 400 instead). Validator stays permissive on the type. */
  _h: z.string().optional(),
});
export type WaitlistSignupInput = z.infer<typeof WaitlistSignupSchema>;
