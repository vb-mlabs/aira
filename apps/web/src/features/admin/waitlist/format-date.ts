// Stable date+time formatter for waitlist tables. Uses Intl on the
// client only (the table is "use client"), so SSR/CSR locale drift can
// surface as a hydration warning — callers add suppressHydrationWarning
// on the rendering cell.
//
// Falls back to the raw ISO string when the input doesn't parse so a
// corrupt row still renders something.

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}
