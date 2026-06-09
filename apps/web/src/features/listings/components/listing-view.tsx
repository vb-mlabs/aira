"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Search, Store, X } from "lucide-react"
import { cn } from "@aira/ui-web/utils"
import { EmptyState } from "@/lib/ui"
import { Pagination } from "./pagination"
import { TierSection } from "./tier-section"
import { CATEGORIES_ORDERED, CATEGORY_META, VALID_TIERS } from "../index"
import type { Business, BusinessCategory, BusinessTier } from "../types"

interface ListingViewProps {
  items: Business[]
  total: number
  page: number
  pageSize: number
  q: string
  verified: boolean
  currentCategory: BusinessCategory
}

const DEBOUNCE_MS = 300

export function ListingView({
  items,
  total,
  page,
  pageSize,
  q,
  verified,
  currentCategory,
}: ListingViewProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // Controlled input keeps a local mirror so typing feels instant; the
  // mirror is reseeded from props whenever the URL-driven q changes
  // (back/forward, category switch, clear). Uses the derived-state
  // pattern recommended for React 19 — compare-and-set during render
  // rather than via useEffect, which the React-hooks lint flags as a
  // cascading-render risk.
  const [inputValue, setInputValue] = useState(q)
  const [lastSyncedQ, setLastSyncedQ] = useState(q)
  if (q !== lastSyncedQ) {
    setLastSyncedQ(q)
    setInputValue(q)
  }
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up any pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function buildHref(overrides: {
    q?: string | null
    page?: number | null
    verified?: boolean | null
  } = {}): string {
    const next: Record<string, string> = {}
    const nextQ = overrides.q === null ? "" : overrides.q ?? q
    if (nextQ) next.q = nextQ
    const nextPage = overrides.page === null ? 1 : overrides.page ?? page
    if (nextPage > 1) next.page = String(nextPage)
    const nextVerified =
      overrides.verified === null ? false : overrides.verified ?? verified
    if (nextVerified) next.verified = "1"
    const qs = new URLSearchParams(next).toString()
    return qs
      ? `/listings/${currentCategory}?${qs}`
      : `/listings/${currentCategory}`
  }

  function pushSearch(nextQ: string) {
    // Search edits always reset to page 1.
    startTransition(() => {
      router.push(buildHref({ q: nextQ || null, page: 1 }))
    })
  }

  function onSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setInputValue(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushSearch(next), DEBOUNCE_MS)
  }

  function clearSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setInputValue("")
    pushSearch("")
  }

  function toggleVerified(nextVerified: boolean) {
    startTransition(() => {
      router.push(buildHref({ verified: nextVerified, page: 1 }))
    })
  }

  function onCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // Switching category clears search/page/filter — landing on a clean
    // category-default view.
    router.push(`/listings/${e.target.value}`)
  }

  // Group the current page's items by tier. TierSection itself drops
  // sections that have zero items, so empty tiers won't render headers.
  const byTier = Object.fromEntries(
    VALID_TIERS.map((t) => [t, items.filter((b) => b.tier === t)]),
  ) as Record<BusinessTier, Business[]>

  return (
    <div>
      {/* Category switcher */}
      <div className="mb-5">
        <div className="relative inline-flex cursor-pointer items-center gap-1">
          <span className="pointer-events-none font-display text-2xl font-semibold text-foreground">
            {CATEGORY_META[currentCategory].displayName}
          </span>
          <ChevronDown
            className="pointer-events-none size-5 flex-shrink-0 text-foreground"
            aria-hidden
          />
          <select
            value={currentCategory}
            onChange={onCategoryChange}
            aria-label="Switch category"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {CATEGORIES_ORDERED.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search
          className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search businesses, cuisines, services..."
          value={inputValue}
          onChange={onSearchInput}
          className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {inputValue && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[
          { label: "All", active: !verified, onClick: () => toggleVerified(false) },
          {
            label: "Verified",
            active: verified,
            onClick: () => toggleVerified(true),
          },
        ].map(({ label, active, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className={cn(
              "flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/60",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div
        className={cn(
          "transition-opacity",
          pending && "pointer-events-none opacity-60",
        )}
      >
        {items.length === 0 ? (
          <EmptyState
            icon={Store}
            title={
              q
                ? `No results for "${q}"`
                : "No listings in this category yet"
            }
            description={
              q
                ? "Try a different search term or clear the filter."
                : "Check back soon — new businesses are added regularly."
            }
            action={
              !q
                ? { label: "Browse all categories", href: "/categories" }
                : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            {VALID_TIERS.map((tier) => (
              <TierSection
                key={tier}
                tier={tier}
                businesses={byTier[tier]}
              />
            ))}
          </div>
        )}

        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          buildHref={(p) => buildHref({ page: p })}
        />
      </div>
    </div>
  )
}
