import "server-only"

import { eq, sql } from "drizzle-orm"
import { membershipPlans, businessSubscriptions } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type {
  MembershipPlan,
  MembershipPlanCreateInput,
  MembershipPlanUpdateInput,
} from "@aira/validators/membership-plans"
import { getMembershipPlanById } from "./queries"

// Domain error surfaced when hard-delete is attempted on a plan that
// still has subscription references. The operation layer translates
// this to ApiError.badRequest with a stable code the UI can key off.
export class MembershipPlanHasSubscriptionsError extends Error {
  constructor(public readonly count: number) {
    super(
      `This plan has ${count} subscription${count === 1 ? "" : "s"}. Deactivate it instead to retire without losing history.`,
    )
    this.name = "MembershipPlanHasSubscriptionsError"
  }
}

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

/**
 * Hard-delete a membership plan. Refuses when any row in
 * `business_subscriptions` still references it (past OR present — we
 * check the row count, not the status). Refusing preserves audit /
 * billing history that would otherwise lose its plan reference to the
 * FK's `onDelete: "set null"` config.
 *
 * Throws `MembershipPlanHasSubscriptionsError` on FK guard failure;
 * returns `null` when the plan doesn't exist; returns the deleted row
 * on success (matches update/deactivate call-site shape).
 */
export async function deleteMembershipPlan(
  db: Database,
  id: string,
): Promise<MembershipPlan | null> {
  const [countRow] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.plan_id, id))
  const count = Number(countRow?.n ?? 0)
  if (count > 0) throw new MembershipPlanHasSubscriptionsError(count)

  const rows = await db
    .delete(membershipPlans)
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
