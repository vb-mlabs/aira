import "server-only"

import { eq, and, between, inArray, sql, desc } from "drizzle-orm"
import { businessSubscriptions, membershipPlans, businesses } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type { BusinessSubscription } from "@aira/validators/business-subscriptions"

export function toSubscription(
  row: typeof businessSubscriptions.$inferSelect,
): BusinessSubscription {
  return {
    ...row,
    plan_id: row.plan_id ?? null,
    payment_evidence_url: row.payment_evidence_url ?? null,
    notes: row.notes ?? null,
    recorded_by: row.recorded_by ?? null,
    start_date: row.start_date.toISOString(),
    end_date: row.end_date.toISOString(),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function listSubscriptionsByBusiness(
  db: Database,
  businessId: string,
): Promise<BusinessSubscription[]> {
  const rows = await db
    .select()
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.business_id, businessId))
    .orderBy(desc(businessSubscriptions.end_date))
  return rows.map(toSubscription)
}

export async function getSubscriptionById(
  db: Database,
  id: string,
): Promise<BusinessSubscription | null> {
  const rows = await db
    .select()
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.id, id))
    .limit(1)
  return rows[0] ? toSubscription(rows[0]) : null
}

export interface RenewingSoonRow {
  subscription_id: string
  business_id: string
  business_name: string
  plan_name: string | null
  payment_status: "paid" | "pending" | "overdue"
  end_date: string
  days_remaining: number
  contact_phone: string | null
  contact_email: string | null
  payment_evidence_url: string | null
}

export async function findRenewingSoon(
  db: Database,
  opts: { withinDays: number },
): Promise<RenewingSoonRow[]> {
  const rows = await db
    .select({
      subscription_id: businessSubscriptions.id,
      business_id: businesses.id,
      business_name: businesses.name,
      plan_name: membershipPlans.name,
      payment_status: businessSubscriptions.payment_status,
      end_date: businessSubscriptions.end_date,
      contact_phone: businesses.phone,
      payment_evidence_url: businessSubscriptions.payment_evidence_url,
    })
    .from(businessSubscriptions)
    .innerJoin(businesses, eq(businessSubscriptions.business_id, businesses.id))
    .leftJoin(membershipPlans, eq(businessSubscriptions.plan_id, membershipPlans.id))
    .where(
      and(
        inArray(businessSubscriptions.payment_status, ["paid", "overdue"]),
        between(
          businessSubscriptions.end_date,
          sql`now()`,
          sql`now() + INTERVAL '${sql.raw(String(opts.withinDays))} days'`,
        ),
      ),
    )
    .orderBy(businessSubscriptions.end_date)

  return rows.map((r) => ({
    subscription_id: r.subscription_id,
    business_id: r.business_id,
    business_name: r.business_name,
    plan_name: r.plan_name ?? null,
    payment_status: r.payment_status,
    end_date: r.end_date.toISOString(),
    days_remaining: Math.ceil(
      (r.end_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
    contact_phone: r.contact_phone ?? null,
    contact_email: null,
    payment_evidence_url: r.payment_evidence_url ?? null,
  }))
}
