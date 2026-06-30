// Small relative-time helper for the community feature. Inlined here per
// the P2a review's open question — first mobile consumer, scoped to this
// feature. Lift to apps/mobile/lib/ if a second feature needs it.
//
// Strategy mirrors web's helper: "just now", "Nm", "Nh", "Nd" for the
// first 7 days; a stable UTC MM/DD/YYYY string after. UTC stable string
// dodges the hydration-style mismatch the web helpers had to suppress.

export function relativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return "";
  const now = Date.now();
  const diffMs = now - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d`;

  // Stable UTC MM/DD/YYYY beyond 7 days.
  const d = new Date(isoDate);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yy = d.getUTCFullYear();
  return `${mm}/${dd}/${yy}`;
}
