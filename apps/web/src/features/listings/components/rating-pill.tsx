import { Star } from "lucide-react"

interface RatingPillProps {
  /** 0–5 in 0.5 steps. NULL is caller-guarded; 0 renders nothing too
   *  (PRD F11: hide stars when 0/null). */
  rating: number
  className?: string
  /** Show the numeric value (e.g. "4.5") next to the stars. Default true. */
  showValue?: boolean
}

/** 5-star rating display used on listing cards and the detail page header.
 *  Renders 5 stars with the filled portion clipped to (rating / 5) so half-
 *  steps render as half-filled. Returns null when rating ≤ 0 so callers can
 *  render it unconditionally. */
export function RatingPill({
  rating,
  className,
  showValue = true,
}: RatingPillProps) {
  if (rating <= 0) return null
  const clamped = Math.min(5, Math.max(0, rating))
  const pct = (clamped / 5) * 100

  return (
    <span
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
      className={`inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-warning ${className ?? ""}`}
    >
      <span className="relative inline-flex leading-none" aria-hidden>
        <span className="flex text-warning/25">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className="size-3.5"
              fill="currentColor"
              strokeWidth={0}
            />
          ))}
        </span>
        <span
          className="absolute inset-y-0 left-0 flex overflow-hidden text-warning"
          style={{ width: `${pct}%` }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className="size-3.5 flex-shrink-0"
              fill="currentColor"
              strokeWidth={0}
            />
          ))}
        </span>
      </span>
      {showValue && <span className="leading-none">{rating.toFixed(1)}</span>}
    </span>
  )
}
