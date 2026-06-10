import "server-only"

import { eq, and } from "drizzle-orm"
import { membershipPlans } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type { MembershipPlan } from "@aira/validators/membership-plans"

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
): Promise<MembershipPlan[]> {
  const conditions = includeInactive
    ? [eq(membershipPlans.city_id, cityId)]
    : [eq(membershipPlans.city_id, cityId), eq(membershipPlans.active, true)]
  const rows = await db
    .select()
    .from(membershipPlans)
    .where(and(...conditions))
  return rows.map(toMembershipPlan)
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
