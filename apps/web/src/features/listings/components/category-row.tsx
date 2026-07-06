import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@aira/ui-web/utils"
import type { CategoryMeta } from "../category-meta"

interface CategoryRowProps {
  category: CategoryMeta
  /** Optional count subtitle (e.g. "12 businesses"). Hidden when omitted. */
  count?: number
  /** Category depth marker for the icon-ring tint.
   *  - `"root"` (default) → olive green (`--tier1`), matches primary
   *    chrome; used on `/categories`.
   *  - `"sub"` → burnt orange (`--tier2`); used under a root on the
   *    PrimaryCategoryView. Mirrors the sponsor-tier ramp so subs
   *    read as "one step in" from primary. QA feedback #3. */
  variant?: "root" | "sub"
}

export function CategoryRow({
  category,
  count,
  variant = "root",
}: CategoryRowProps) {
  const Icon = category.icon
  const tint =
    variant === "sub"
      ? "bg-[color:var(--tier2)]/10 text-[color:var(--tier2)]"
      : "bg-primary/10 text-primary"
  return (
    <Link
      href={`/listings/${category.slug}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-[var(--shadow-card)] transition-colors hover:bg-accent",
        variant === "sub"
          ? "hover:border-[color:var(--tier2)]"
          : "hover:border-primary",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-9 flex-shrink-0 items-center justify-center rounded-full",
          tint,
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base text-foreground">
          {category.displayName}
        </span>
        {typeof count === "number" ? (
          <span className="block truncate text-[0.7rem] text-muted-foreground">
            {`${count} ${count === 1 ? "business" : "businesses"}`}
          </span>
        ) : null}
      </span>
      <ChevronRight
        className="size-4 flex-shrink-0 text-muted-foreground"
        aria-hidden
      />
    </Link>
  )
}
