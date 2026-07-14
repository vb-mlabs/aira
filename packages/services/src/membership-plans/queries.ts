import "server-only"

import { eq, and, sql } from "drizzle-orm"
import { membershipPlans, businessSubscriptions } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type {
  MembershipPlan,
  MembershipPlanListItem,
} from "@aira/validators/membership-plans"

function toMembershipPlan(row: typeof membershipPlans.$inferSelect): MembershipPlan {
  return {
    ...row,
    description: row.description ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function listMembershipPlans(
  db: Database,
  cityId: string,
  includeInactive = false,
): Promise<MembershipPlanListItem[]> {
  const conditions = includeInactive
    ? [eq(membershipPlans.city_id, cityId)]
    : [eq(membershipPlans.city_id, cityId), eq(membershipPlans.active, true)]

  // Correlated subquery — one COUNT per plan row. Fine at expected plan
  // volumes (~5-20 per city); if this ever needs to scale, swap for
  // LEFT JOIN + GROUP BY.
  const subscriptionCount = sql<number>`(
    SELECT COUNT(*)::int
    FROM ${businessSubscriptions}
    WHERE ${businessSubscriptions.plan_id} = ${membershipPlans.id}
  )`.as("subscription_count")

  const rows = await db
    .select({
      plan: membershipPlans,
      subscription_count: subscriptionCount,
    })
    .from(membershipPlans)
    .where(and(...conditions))

  return rows.map(({ plan, subscription_count }) => ({
    ...toMembershipPlan(plan),
    subscription_count: Number(subscription_count),
  }))
}

export async function getMembershipPlanById(
  db: Database,
  id: string,
): Promise<MembershipPlan | null> {
  const rows = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.id, id))
    .limit(1)
  return rows[0] ? toMembershipPlan(rows[0]) : null
}
