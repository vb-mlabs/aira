import { z } from "zod"

export const PaymentStatusSchema = z.enum(["paid", "pending", "overdue"])
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>

export const BusinessSubscriptionSchema = z.object({
  id: z.string(),
  business_id: z.string(),
  plan_id: z.string().nullable(),
  payment_status: PaymentStatusSchema,
  start_date: z.string(),
  end_date: z.string(),
  amount_cents: z.number().int().nonnegative(),
  /**
   * Only present in admin contexts — never exposed on public responses.
   * Not `.url()`: the Replit storage driver returns relative paths through
   * the `/api/storage/[...key]` proxy (see apps/web/src/lib/storage/drivers/replit.ts).
   */
  payment_evidence_url: z.string().min(1).nullable(),
  notes: z.string().nullable(),
  recorded_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type BusinessSubscription = z.infer<typeof BusinessSubscriptionSchema>

export const BusinessSubscriptionCreateInputSchema = z
  .object({
    business_id: z.string().min(1),
    plan_id: z.string().min(1).nullable().optional(),
    payment_status: PaymentStatusSchema,
    start_date: z.string().datetime(),
    end_date: z.string().datetime(),
    amount_cents: z.number().int().nonnegative(),
    // Not `.url()` — see BusinessSubscriptionSchema.
    payment_evidence_url: z.string().min(1).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    recorded_by: z.string().max(200).nullable().optional(),
  })
  .strict()
export type BusinessSubscriptionCreateInput = z.infer<typeof BusinessSubscriptionCreateInputSchema>

export const BusinessSubscriptionUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    payment_status: PaymentStatusSchema.optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    amount_cents: z.number().int().nonnegative().optional(),
    // Not `.url()` — see BusinessSubscriptionSchema.
    payment_evidence_url: z.string().min(1).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .strict()
export type BusinessSubscriptionUpdateInput = z.infer<typeof BusinessSubscriptionUpdateInputSchema>

export const BusinessSubscriptionListOutputSchema = z.object({
  items: z.array(BusinessSubscriptionSchema),
})
export type BusinessSubscriptionListOutput = z.infer<typeof BusinessSubscriptionListOutputSchema>
