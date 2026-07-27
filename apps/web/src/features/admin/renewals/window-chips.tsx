// F23′ — window selector chips + "Include resolved & scheduled" toggle
// for the renewals queue.
//
// Server component. Mirrors the community StatusFilter shape: plain
// <Link> chips that update ?withinDays= / ?showAll= via URL navigation.
// The page reads the params and re-fetches the queue.
//
// Chip values (7/14/30/60/90) mirror the existing RenewingFilter on
// /admin/businesses plus 60/90 since the queue includes overdue rows
// without an upper-past cap.
//
// The include-resolved toggle chip demotes the visual (a separator +
// slightly different active treatment via aria-pressed) so admins
// still parse the window row first. All chip hrefs preserve/emit
// ?showAll=1 based on the current mode, so toggling the window doesn't
// silently reset the include-resolved state.

import Link from "next/link"
import { cn } from "@aira/ui-web/utils"

interface WindowChipsProps {
  current: number
  showAll: boolean
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

function withParams(withinDays: number, showAll: boolean): string {
  const params = new URLSearchParams()
  params.set("withinDays", String(withinDays))
  if (showAll) params.set("showAll", "1")
  return `/admin/renewals?${params.toString()}`
}

export function WindowChips({ current, showAll }: WindowChipsProps) {
  return (
    <nav
      aria-label="Renewals filters"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-xs text-muted-foreground">Renewing in:</span>
      {CHIPS.map((chip) => {
        const active = chip.value === current
        return (
          <Link
            key={chip.value}
            href={withParams(chip.value, showAll)}
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

      {/* Divider mirrors the businesses page's filter/chip separator. */}
      <div aria-hidden className="h-4 w-px bg-border" />

      <Link
        href={withParams(current, !showAll)}
        aria-pressed={showAll}
        className={cn(
          "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          showAll
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground hover:border-primary/60",
        )}
      >
        Include resolved &amp; scheduled
      </Link>
    </nav>
  )
}
