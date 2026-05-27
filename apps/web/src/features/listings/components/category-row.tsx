import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { CategoryMeta } from "../category-meta"

interface CategoryRowProps {
  category: CategoryMeta
  /** Optional count subtitle (e.g. "12 businesses"). Hidden when omitted. */
  count?: number
}

export function CategoryRow({ category, count }: CategoryRowProps) {
  const Icon = category.icon
  return (
    <Link
      href={`/listings/${category.slug}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-primary hover:bg-accent"
    >
      <span
        aria-hidden
        className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base text-foreground">
          {category.displayName}
        </span>
        <span className="block truncate text-[0.7rem] text-muted-foreground">
          {typeof count === "number"
            ? `${count} ${count === 1 ? "business" : "businesses"}`
            : category.description}
        </span>
      </span>
      <ChevronRight
        className="size-4 flex-shrink-0 text-muted-foreground"
        aria-hidden
      />
    </Link>
  )
}
