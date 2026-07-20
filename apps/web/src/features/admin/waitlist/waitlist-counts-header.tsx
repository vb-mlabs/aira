// Two-tile counts header above the tab strip. Mirrors the StatTile
// pattern on /admin (apps/web/src/app/admin/page.tsx) so the visual
// rhythm matches.

interface WaitlistCountsHeaderProps {
  counts: { consumer: number; business: number }
}

export function WaitlistCountsHeader({ counts }: WaitlistCountsHeaderProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <Tile label="Consumer signups" value={counts.consumer} />
      <Tile label="Business signups" value={counts.business} />
    </section>
  )
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card px-4 py-5 shadow-[var(--shadow-card)]">
      <p className="font-display text-3xl font-semibold leading-none text-primary tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  )
}
