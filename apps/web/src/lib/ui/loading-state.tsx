// LoadingState — three variants, one per situation:
//   - skeleton: matches list shape; for content lists (DataList default)
//   - spinner: action feedback ("Saving…"); for buttons and short waits
//   - shimmer: card placeholder; for non-list content blocks
// Per Design Decision D3: skeleton for lists, spinner for actions.

import { Loader2 } from "lucide-react"
import { Skeleton } from "@mlabs/ui-web/skeleton"
import { cn } from "@mlabs/ui-web/utils"

interface LoadingStateProps {
  variant?: "skeleton" | "spinner" | "shimmer"
  /** Number of skeleton rows; ignored for spinner/shimmer. */
  rows?: number
  /** Optional accessible label. */
  label?: string
  className?: string
}

export function LoadingState({
  variant = "skeleton",
  rows = 5,
  label = "Loading…",
  className,
}: LoadingStateProps) {
  if (variant === "spinner") {
    return (
      <div
        role="status"
        aria-label={label}
        className={cn("flex items-center justify-center py-8", className)}
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  if (variant === "shimmer") {
    return (
      <div
        role="status"
        aria-label={label}
        className={cn("space-y-3", className)}
      >
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  // skeleton (default — for lists)
  return (
    <div role="status" aria-label={label} className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
