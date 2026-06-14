// F20 v2 — filter chips for the admin community queue.
//
// Server component. Each chip is a plain <Link> updating the ?status=
// query param. The page reads searchParams.status to drive the active
// state; counts come from the same round-trip that fetched the rows.

import Link from "next/link"
import { cn } from "@aira/ui-web/utils"
import type {
  CommunityPostStatus,
  StatusCounts,
} from "@aira/validators/community"

interface StatusFilterProps {
  currentStatus: CommunityPostStatus
  counts: StatusCounts
}

interface Chip {
  status: CommunityPostStatus
  label: string
}

const CHIPS: readonly Chip[] = [
  { status: "pending", label: "Pending" },
  { status: "approved", label: "Approved" },
  { status: "expired", label: "Expired" },
  { status: "rejected", label: "Rejected" },
] as const

export function StatusFilter({ currentStatus, counts }: StatusFilterProps) {
  return (
    <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
      {CHIPS.map((chip) => {
        const active = chip.status === currentStatus
        const count = counts[chip.status]
        return (
          <Link
            key={chip.status}
            href={`/admin/community?status=${chip.status}`}
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
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
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
