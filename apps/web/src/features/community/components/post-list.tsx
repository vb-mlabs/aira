"use client"

// Public board — search + paginated card list. Hydrates from
// server-fetched initial data; subsequent searches / page changes go
// through GET /api/v1/community/posts.

import { useEffect, useState, useTransition } from "react"
import { Search, Sparkles } from "lucide-react"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { ApiError } from "@aira/api"
import { apiClient } from "@/lib/api-client"
import { EmptyState } from "@/lib/ui"
import type { PostRow } from "../types"
import { PostCard } from "./post-card"
import { PostDetailModal } from "./post-detail-modal"

interface ListResponse {
  items: PostRow[]
  total: number
  page: number
  pageSize: number
}

interface PostListProps {
  initial: ListResponse
  /** id of the current viewer so PostCard knows when to suppress the
   *  "I can help" button (post author). null when unknown. */
  currentUserId: string | null
}

export function PostList({ initial, currentUserId }: PostListProps) {
  const [data, setData] = useState<ListResponse>(initial)
  const [searchInput, setSearchInput] = useState("")
  const [activeQuery, setActiveQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [openId, setOpenId] = useState<string | null>(null)

  // Debounce the search input — fire after 300ms idle.
  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === activeQuery) return
    const handle = setTimeout(() => {
      void fetchPage(1, trimmed)
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  async function fetchPage(page: number, q: string) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await apiClient.get<ListResponse>("/api/v1/community/posts", {
          query: { page, pageSize: data.pageSize, q: q || undefined },
        })
        if (res.data) {
          setData(res.data)
          setActiveQuery(q)
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
          return
        }
        throw err
      }
    })
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const isEmpty = data.items.length === 0

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search
          aria-hidden
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search posts (room for rent, caterer, sale, referral…)"
          className="pl-9"
          aria-label="Search community posts"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {isEmpty ? (
        <EmptyState
          icon={Sparkles}
          title={
            activeQuery
              ? "No posts match that search"
              : "Be the first to post on AIRA"
          }
          description={
            activeQuery
              ? "Try a shorter keyword or clear the search."
              : "Tap “Post on AIRA” above to share a post — a moderator will review it before it goes live."
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.items.map((post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                currentUserId={currentUserId}
                onOpen={() => setOpenId(post.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {!isEmpty && totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between border-t border-border pt-4"
        >
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {totalPages} &middot; {data.total} post
            {data.total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || data.page <= 1}
              onClick={() => fetchPage(data.page - 1, activeQuery)}
            >
              ← Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || data.page >= totalPages}
              onClick={() => fetchPage(data.page + 1, activeQuery)}
            >
              Next →
            </Button>
          </div>
        </nav>
      )}

      {pending && !isEmpty && (
        <p className="text-xs text-muted-foreground">Loading…</p>
      )}

      {(() => {
        const opened = data.items.find((p) => p.id === openId)
        if (!opened) return null
        return (
          <PostDetailModal
            post={opened}
            open
            onClose={() => setOpenId(null)}
            currentUserId={currentUserId}
          />
        )
      })()}
    </div>
  )
}
