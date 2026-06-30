// URL-state tab strip for /admin/waitlist. Server component, plain
// <Link>s — mirrors features/admin/renewals/window-chips.tsx so a
// refresh after delete keeps the same tab.

import Link from "next/link"
import { cn } from "@aira/ui-web/utils"
import type { WaitlistType } from "@aira/validators"

interface WaitlistTabsProps {
  current: WaitlistType
  /** Per-tab totals so each label can carry "(N)" hint without an
   *  extra round-trip — the page already fetched counts. */
  counts: { consumer: number; business: number }
}

const TABS: ReadonlyArray<{ value: WaitlistType; label: string }> = [
  { value: "consumer", label: "Consumer" },
  { value: "business", label: "Business" },
] as const

export function WaitlistTabs({ current, counts }: WaitlistTabsProps) {
  return (
    <nav aria-label="Waitlist type" className="flex flex-wrap items-center gap-2">
      {TABS.map((tab) => {
        const active = tab.value === current
        const count = counts[tab.value]
        return (
          <Link
            key={tab.value}
            href={`/admin/waitlist?tab=${tab.value}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/60",
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                active
                  ? "bg-primary-foreground/15 text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
