// Waitlist signup contracts. Consumed by apps/web's /api/v1/waitlist and
// /api/v1/business-waitlist routes and their matching marketing-page form
// components.
//
// Pure Zod; no Drizzle (enforced by no-drizzle-in-schemas).
//
// IMPORTANT: The `source` and enum values are duplicated as CHECK constraints
// on the `waitlist` table in packages/db/src/schema/waitlist.ts.
// New values must be added in BOTH places. Defense-in-depth — keeps the DB
// honest if a caller ever bypasses Zod.

import { z } from "zod";
import { emailSchema } from "./auth";

/** Row type. Lives in two places — keep this and the DB CHECK in sync. */
export const WaitlistTypeSchema = z.enum(["consumer", "business"]);
export type WaitlistType = z.infer<typeof WaitlistTypeSchema>;

/** Capture point. Lives in two places — keep this and the DB CHECK in sync. */
export const WaitlistSourceSchema = z.enum([
  "marketing-hero",
  "marketing-footer",
  "business-mailto",
  "business-listing-cta",
]);
export type WaitlistSource = z.infer<typeof WaitlistSourceSchema>;

/** ── Consumer signup ─────────────────────────────────────────────────── */

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

/** ── Business signup ─────────────────────────────────────────────────── */

export const PreferredContactSchema = z.enum(["phone", "whatsapp", "email"]);
export type PreferredContact = z.infer<typeof PreferredContactSchema>;

export const PreferredTimeSchema = z.enum([
  "morning",
  "afternoon",
  "evening",
  "anytime",
]);
export type PreferredTime = z.infer<typeof PreferredTimeSchema>;

export const BusinessWaitlistSignupSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  business_name: z.string().min(1, "Business name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: emailSchema,
  preferred_contact: PreferredContactSchema,
  preferred_time: PreferredTimeSchema,
  source: WaitlistSourceSchema.default("business-listing-cta"),
  _h: z.string().optional(),
});
export type BusinessWaitlistSignupInput = z.infer<
  typeof BusinessWaitlistSignupSchema
>;
