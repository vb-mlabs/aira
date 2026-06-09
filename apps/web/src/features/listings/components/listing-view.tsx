"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronDown, Store } from "lucide-react"
import { cn } from "@aira/ui-web/utils"
import { EmptyState } from "@/lib/ui"
import { TierSection } from "./tier-section"
import { CATEGORIES_ORDERED, CATEGORY_META, VALID_TIERS } from "../index"
import type { Business, BusinessCategory, BusinessTier } from "../types"

interface ListingViewProps {
  businesses: Business[]
  currentCategory: BusinessCategory
}

export function ListingView({ businesses, currentCategory }: ListingViewProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const filtered = useMemo(() => {
    let result = businesses
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q) ||
          b.address?.toLowerCase().includes(q),
      )
    }
    if (verifiedOnly) result = result.filter((b) => b.verified)
    return result
  }, [businesses, query, verifiedOnly])

  const byTier = useMemo(
    () =>
      Object.fromEntries(
        VALID_TIERS.map((t) => [t, filtered.filter((b) => b.tier === t)]),
      ) as Record<BusinessTier, Business[]>,
    [filtered],
  )

  return (
    <div>
      {/* Category switcher */}
      <div className="mb-5">
        <div className="relative inline-flex cursor-pointer items-center gap-1">
          {/* Visible label — sizes the container to the current text */}
          <span className="pointer-events-none font-display text-2xl font-semibold text-foreground">
            {CATEGORY_META[currentCategory].displayName}
          </span>
          <ChevronDown className="pointer-events-none size-5 flex-shrink-0 text-foreground" aria-hidden />
          {/* Transparent native select overlaid for interaction */}
          <select
            value={currentCategory}
            onChange={(e) => router.push(`/listings/${e.target.value}`)}
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Filter chips */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[
          { label: "All", active: !verifiedOnly, onClick: () => setVerifiedOnly(false) },
          { label: "Verified", active: verifiedOnly, onClick: () => setVerifiedOnly(true) },
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
      {filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title={query ? "No results match your search" : "No listings in this category yet"}
          description={
            query
              ? "Try a different search term or clear the filter."
              : "Check back soon — new businesses are added regularly."
          }
          action={!query ? { label: "Browse all categories", href: "/categories" } : undefined}
        />
      ) : (
        <div className="space-y-6">
          {VALID_TIERS.map((tier) => (
            <TierSection key={tier} tier={tier} businesses={byTier[tier]} />
          ))}
        </div>
      )}
    </div>
  )
}
