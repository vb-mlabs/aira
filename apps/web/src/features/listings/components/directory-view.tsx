"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Search, Store, X } from "lucide-react"
import { cn } from "@aira/ui-web/utils"
import { EmptyState } from "@/lib/ui"
import { TierSection } from "./tier-section"
import { CATEGORIES_ORDERED, VALID_TIERS } from "../index"
import type { Business, BusinessTier } from "../types"
import { apiClient } from "@/lib/api-client"
import type { BusinessListOutput } from "@aira/validators/businesses"

interface DirectoryViewProps {
  initialItems: Business[]
  total: number
  pageSize: number
}

const DEBOUNCE_MS = 300

export function DirectoryView({
  initialItems,
  total: initialTotal,
  pageSize,
}: DirectoryViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [items, setItems] = useState<Business[]>(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState("")
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function fetchPage(nextQ: string, nextPage: number, append: boolean) {
    setLoading(true)
    try {
      const query: Record<string, string | number | boolean> = {
        page: nextPage,
        pageSize,
      }
      if (nextQ) query.q = nextQ
      const res = await apiClient.get<BusinessListOutput>(
        "/api/v1/businesses",
        { query },
      )
      if (!res.data) return
      if (append) {
        setItems((prev) => [...prev, ...res.data!.items])
      } else {
        setItems(res.data.items)
      }
      setTotal(res.data.total)
      setPage(nextPage)
    } finally {
      setLoading(false)
    }
  }

  function onSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setInputValue(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQ(next)
      fetchPage(next, 1, false)
    }, DEBOUNCE_MS)
  }

  function clearSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setInputValue("")
    setQ("")
    fetchPage("", 1, false)
  }

  function loadMore() {
    fetchPage(q, page + 1, true)
  }

  function onCategoryPill(slug: string) {
    startTransition(() => {
      router.push(`/listings/${slug}`)
    })
  }

  const hasMore = items.length < total

  const byTier = Object.fromEntries(
    VALID_TIERS.map((t) => [t, items.filter((b) => b.tier === t)]),
  ) as Record<BusinessTier, Business[]>

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          All Businesses
        </h1>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search
          className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search businesses, cuisines, services…"
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

      {/* Category pills — "All" is the current page; others navigate */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span
          className="flex-shrink-0 rounded-full border border-primary bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground"
          aria-current="page"
        >
          All
        </span>
        {CATEGORIES_ORDERED.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => onCategoryPill(cat.slug)}
            className="flex-shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/60"
          >
            {cat.displayName}
          </button>
        ))}
      </div>

      {/* Results */}
      <div
        className={cn(
          "transition-opacity",
          loading && items.length === 0 && "pointer-events-none opacity-60",
        )}
      >
        {items.length === 0 && !loading ? (
          <EmptyState
            icon={Store}
            title={q ? `No results for "${q}"` : "No businesses listed yet"}
            description={
              q
                ? "Try a different search term or clear the filter."
                : "Check back soon — new businesses are added regularly."
            }
            action={
              !q
                ? { label: "Browse by category", href: "/categories" }
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

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/60 disabled:opacity-50"
            >
              {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}

        {!hasMore && items.length > 0 && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Showing all {total} {total === 1 ? "business" : "businesses"}
            {q && ` matching "${q}"`}
          </p>
        )}
      </div>
    </div>
  )
}
