import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@aira/ui-web/utils"

interface PaginationProps {
  /** Total matching rows across all pages. */
  total: number
  /** 1-indexed current page. */
  page: number
  /** Page size. */
  pageSize: number
  /** Build the href for a given target page. The caller controls URL
   *  shape (preserves ?q, ?verified, etc.). */
  buildHref: (targetPage: number) => string
}

/** Numbered pagination — Prev · 1 · 2 · 3 · … · N · Next.
 *
 *  Truncation rule: always show first, last, current ±1; ellipses fill
 *  the gaps. Hides itself entirely when total <= pageSize.
 */
export function Pagination({ total, page, pageSize, buildHref }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const pages = buildPageList(page, totalPages)
  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-1"
    >
      <PaginationEdge
        kind="prev"
        href={buildHref(page - 1)}
        disabled={prevDisabled}
      />
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`gap-${i}`}
            aria-hidden
            className="px-2 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <PaginationPage
            key={p}
            page={p}
            href={buildHref(p)}
            active={p === page}
          />
        ),
      )}
      <PaginationEdge
        kind="next"
        href={buildHref(page + 1)}
        disabled={nextDisabled}
      />
    </nav>
  )
}

function PaginationPage({
  page,
  href,
  active,
}: {
  page: number
  href: string
  active: boolean
}) {
  const base =
    "inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors"
  if (active) {
    return (
      <span
        aria-current="page"
        className={cn(base, "bg-primary text-primary-foreground")}
      >
        {page}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className={cn(base, "text-foreground hover:bg-muted")}
      aria-label={`Go to page ${page}`}
    >
      {page}
    </Link>
  )
}

function PaginationEdge({
  kind,
  href,
  disabled,
}: {
  kind: "prev" | "next"
  href: string
  disabled: boolean
}) {
  const Icon = kind === "prev" ? ChevronLeft : ChevronRight
  const label = kind === "prev" ? "Previous page" : "Next page"
  const base =
    "inline-flex size-9 items-center justify-center rounded-lg text-sm transition-colors"
  if (disabled) {
    return (
      <span
        aria-hidden
        className={cn(base, "text-muted-foreground/40")}
      >
        <Icon className="size-4" />
      </span>
    )
  }
  return (
    <Link
      href={href}
      className={cn(base, "text-foreground hover:bg-muted")}
      aria-label={label}
    >
      <Icon className="size-4" aria-hidden />
    </Link>
  )
}

/** Compute the visible page list with first, last, current ±1, and
 *  ellipsis placeholders. Returns the literal string "…" for gap
 *  markers; the renderer key-discriminates by index since multiple
 *  ellipses are possible. */
function buildPageList(page: number, totalPages: number): Array<number | "…"> {
  // Small list — show every page.
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const out: Array<number | "…"> = []
  const showAround = new Set<number>([1, totalPages, page - 1, page, page + 1])
  // Clamp to valid range
  for (const n of [...showAround]) {
    if (n < 1 || n > totalPages) showAround.delete(n)
  }
  const sorted = [...showAround].sort((a, b) => a - b)
  let last = 0
  for (const n of sorted) {
    if (last > 0 && n - last > 1) out.push("…")
    out.push(n)
    last = n
  }
  return out
}
