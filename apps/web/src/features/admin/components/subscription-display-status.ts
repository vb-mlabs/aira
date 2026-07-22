/** Derived display status for a business subscription row.
 *
 *  The stored `payment_status` enum has only three values: paid | pending |
 *  overdue. Once a listing has a newer subscription whose start is after
 *  this row's end, the row is effectively expired — even though the DB
 *  still holds its last known payment state. Surface that as "expired" so
 *  admins reading the Subscriptions table aren't confused by a stale
 *  "Overdue" badge on a superseded row.
 *
 *  UI-only derivation (Option A from
 *  .mstack/debug/2026-07-22-1310-subscription-overdue-not-expired-on-renewal/report.md);
 *  no schema change, no back-fill.
 *
 *  Consumed by:
 *  - features/admin/components/subscriptions-section.tsx (badge label + style)
 */

export type StoredPaymentStatus = "paid" | "pending" | "overdue"
export type DisplayStatus = StoredPaymentStatus | "expired"

interface SubscriptionRow {
  payment_status: StoredPaymentStatus
  start_date: string
  end_date: string
}

export function deriveDisplayStatus(
  sub: SubscriptionRow,
  all: readonly SubscriptionRow[],
): DisplayStatus {
  if (all.length <= 1) return sub.payment_status
  let maxStart = ""
  for (const s of all) {
    if (s.start_date > maxStart) maxStart = s.start_date
  }
  return sub.end_date < maxStart ? "expired" : sub.payment_status
}
