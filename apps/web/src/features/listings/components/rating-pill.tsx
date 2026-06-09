import { Star } from "lucide-react"

interface RatingPillProps {
  /** 0–5 in 0.5 steps. NULL is caller-guarded; 0 renders nothing too
   *  (PRD F11: hide stars when 0/null). */
  rating: number
  className?: string
}

/** Compact inline ★ {value} pill used on listing cards and the detail
 *  page header. Always renders to 1 decimal (★ 4.0, not ★ 4) for grid
 *  alignment. Returns null when rating ≤ 0 so the caller can render it
 *  unconditionally if they prefer. */
export function RatingPill({ rating, className }: RatingPillProps) {
  if (rating <= 0) return null
  return (
    <span
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
      className={`inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-warning ${className ?? ""}`}
    >
      <Star
        className="size-3.5"
        aria-hidden
        fill="currentColor"
        strokeWidth={0}
      />
      <span className="leading-none">{rating.toFixed(1)}</span>
    </span>
  )
}
