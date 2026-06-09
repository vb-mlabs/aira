interface StatCardProps {
  value: string
  label: string
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="rounded-xl bg-card px-4 py-5 text-center shadow-[var(--shadow-card)]">
      <p className="font-display text-3xl font-semibold leading-none text-primary">
        {value}
      </p>
      <p className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  )
}
