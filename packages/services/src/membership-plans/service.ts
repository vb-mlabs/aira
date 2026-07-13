import "server-only"

import { eq } from "drizzle-orm"
import { membershipPlans } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type {
  MembershipPlan,
  MembershipPlanCreateInput,
  MembershipPlanUpdateInput,
} from "@aira/validators/membership-plans"
import { getMembershipPlanById } from "./queries"

export async function createMembershipPlan(
  db: Database,
  input: MembershipPlanCreateInput,
): Promise<MembershipPlan> {
  const rows = await db
    .insert(membershipPlans)
    .values({
      city_id: input.city_id,
      name: input.name,
      description: input.description ?? null,
      price_cents: input.price_cents,
      duration_months: input.duration_months,
    })
    .returning()
  const row = rows[0]
  if (!row) throw new Error("insert membership_plan returned no row")
  return {
    ...row,
    description: row.description ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function updateMembershipPlan(
  db: Database,
  input: MembershipPlanUpdateInput,
): Promise<MembershipPlan | null> {
  const { id, ...rest } = input
  if (Object.keys(rest).length === 0) return getMembershipPlanById(db, id)
  const rows = await db
    .update(membershipPlans)
    .set(rest)
    .where(eq(membershipPlans.id, id))
    .returning()
  const row = rows[0]
  if (!row) return null
  return {
    ...row,
    description: row.description ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function deactivateMembershipPlan(
  db: Database,
  id: string,
): Promise<MembershipPlan | null> {
  return updateMembershipPlan(db, { id, active: false })
}
