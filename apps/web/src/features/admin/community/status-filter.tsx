// F20 v2 — filter chips for the admin community queue.
//
// Server component. Each chip is a plain <Link> updating the ?status=
// query param. The page reads searchParams.status to drive the active
// state; counts come from the same round-trip that fetched the rows.
//
// "All" is the default — keeps everything visible on first hit so an
// admin landing on the page sees the full picture. Pending is one click
// away via its chip.

import Link from "next/link"
import { cn } from "@aira/ui-web/utils"
import type {
  CommunityPostStatus,
  StatusCounts,
} from "@aira/validators/community"

/** Page-level filter selector. "all" means no `status=` query param at all;
 *  each named status drives the matching DB filter. */
export type StatusFilterValue = "all" | CommunityPostStatus

interface StatusFilterProps {
  currentStatus: StatusFilterValue
  counts: StatusCounts
}

interface Chip {
  status: StatusFilterValue
  label: string
  href: string
}

const CHIPS: readonly Chip[] = [
  { status: "all", label: "All", href: "/admin/community" },
  { status: "pending", label: "Pending", href: "/admin/community?status=pending" },
  { status: "approved", label: "Approved", href: "/admin/community?status=approved" },
  { status: "expired", label: "Expired", href: "/admin/community?status=expired" },
  { status: "rejected", label: "Rejected", href: "/admin/community?status=rejected" },
] as const

function countFor(status: StatusFilterValue, counts: StatusCounts): number {
  if (status === "all") {
    return counts.pending + counts.approved + counts.expired + counts.rejected
  }
  return counts[status]
}

export function StatusFilter({ currentStatus, counts }: StatusFilterProps) {
  return (
    <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
      {CHIPS.map((chip) => {
        const active = chip.status === currentStatus
        const count = countFor(chip.status, counts)
        return (
          <Link
            key={chip.status}
            href={chip.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {chip.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-bold",
                active
                  ? "bg-primary-foreground/20 text-primary-foreground"
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
