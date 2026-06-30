/** Shared expiry wording for admin renewal surfaces.
 *
 *  "OVERDUE 2d" / "in 5 days" / "today" — stable UTC for the absolute
 *  fallback (post-7d) per 2026-06-14 hydration lesson.
 *
 *  Consumed by:
 *  - features/admin/renewals/renewal-queue-table.tsx (Expiry column)
 *  - app/admin/businesses/page.tsx (Subscription cell urgency caption)
 */
export function expiryLabel(daysRemaining: number, endDateIso: string): string {
  if (daysRemaining < 0) return `OVERDUE ${Math.abs(daysRemaining)}d`
  if (daysRemaining === 0) return "today"
  if (daysRemaining === 1) return "tomorrow"
  if (daysRemaining <= 7) return `in ${daysRemaining} days`
  const d = new Date(endDateIso)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${d.getUTCFullYear()}`
}
