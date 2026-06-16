// F23′ — window selector chips for the renewals queue.
//
// Server component. Mirrors the community StatusFilter shape: plain
// <Link> chips that update ?withinDays= via URL navigation. The page
// reads the param and re-fetches the queue. Same chip values as the
// existing RenewingFilter on /admin/businesses (7/14/30) plus 60/90
// since the queue includes overdue rows without an upper-past cap.

import Link from "next/link"
import { cn } from "@aira/ui-web/utils"

interface WindowChipsProps {
  current: number
}

interface Chip {
  value: number
  label: string
}

const CHIPS: readonly Chip[] = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
] as const

export function WindowChips({ current }: WindowChipsProps) {
  return (
    <nav aria-label="Window" className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Renewing in:</span>
      {CHIPS.map((chip) => {
        const active = chip.value === current
        return (
          <Link
            key={chip.value}
            href={`/admin/renewals?withinDays=${chip.value}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/60",
            )}
          >
            {chip.label}
          </Link>
        )
      })}
    </nav>
  )
}
