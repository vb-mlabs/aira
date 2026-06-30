"use client"

// Debounced user picker for the assign-owner flow. Reuses the existing
// admin user-list endpoint (listUsersOp → GET /api/v1/admin/users) so the
// search semantics match the /admin/users screen. Min 2 chars; 300ms
// debounce; banned users are surfaced with a label so admins can decide
// whether to link them anyway.

import { useEffect, useRef, useState } from "react"
import { ApiError } from "@aira/api"
import { apiClient } from "@/lib/api-client"

const DEBOUNCE_MS = 300
const MIN_QUERY_LEN = 2

export interface PickedUser {
  id: string
  name: string
  email: string
  banned: boolean
}

interface ListUsersResponse {
  items: Array<{
    id: string
    name: string
    email: string
    banned_at: string | null
  }>
}

interface BusinessOwnerPickerProps {
  /** Excluded from the result list so the admin doesn't re-pick the same
   *  user as a no-op overwrite. null when the business has no current
   *  owner. */
  excludeUserId: string | null
  onPick: (user: PickedUser) => void
}

export function BusinessOwnerPicker({
  excludeUserId,
  onPick,
}: BusinessOwnerPickerProps) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<PickedUser[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inflight = useRef<AbortController | null>(null)

  // Resets happen in the input handler (event-driven) so the effect body
  // never synchronously sets state on the "query too short" path — keeps
  // react-hooks/set-state-in-effect happy.
  function handleQueryChange(next: string) {
    setQ(next)
    if (next.trim().length < MIN_QUERY_LEN) {
      inflight.current?.abort()
      inflight.current = null
      setResults([])
      setPending(false)
      setError(null)
    }
  }

  useEffect(() => {
    const trimmed = q.trim()
    if (trimmed.length < MIN_QUERY_LEN) return
    const handle = setTimeout(async () => {
      inflight.current?.abort()
      const ctrl = new AbortController()
      inflight.current = ctrl
      setPending(true)
      setError(null)
      try {
        const res = await apiClient.get<ListUsersResponse>(
          "/api/v1/admin/users",
          { query: { q: trimmed }, signal: ctrl.signal },
        )
        if (ctrl.signal.aborted) return
        const items = res.data?.items ?? []
        setResults(
          items
            .filter((u) => u.id !== excludeUserId)
            .map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              banned: u.banned_at !== null,
            })),
        )
      } catch (err) {
        if (ctrl.signal.aborted) return
        setError(
          err instanceof ApiError ? err.message : "Could not search users.",
        )
      } finally {
        if (!ctrl.signal.aborted) setPending(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [q, excludeUserId])

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="owner-picker-search"
          className="block text-xs font-semibold text-foreground"
        >
          Search by name or email
        </label>
        <input
          id="owner-picker-search"
          type="search"
          autoComplete="off"
          value={q}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Min. 2 characters"
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {q.trim().length >= MIN_QUERY_LEN && (
        <div className="rounded-md border border-border bg-card">
          {pending ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              No matching users.
            </p>
          ) : (
            <ul className="max-h-64 divide-y divide-border overflow-y-auto">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => onPick(u)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {u.name || "(no name)"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {u.email}
                      </span>
                    </span>
                    {u.banned && (
                      <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                        Banned
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
