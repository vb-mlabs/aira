"use client"

// F22 — admin user typeahead for the audit log actor filter.
//
// Debounced (300ms) input firing GET /api/v1/admin/users?q=… via the
// shared apiClient. Selecting a result writes ?actor_id=<id> to the
// page's URL via router.push so the RSC re-fetches and the table
// re-renders. Clearing drops the actor_id param.

import { useEffect, useId, useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { ApiError } from "@aira/api"
import { Input } from "@aira/ui-web/input"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"
import type { AdminUserRow } from "@aira/validators/admin"

const DEBOUNCE_MS = 300
const MAX_RESULTS = 10

interface ActorTypeaheadProps {
  /** Display label for the actor currently locked into ?actor_id=, if any.
   *  Server renders this; null when no actor_id is active. */
  initialActor: { id: string; name: string; email: string } | null
}

interface ListUsersResponse {
  items: AdminUserRow[]
}

export function ActorTypeahead({ initialActor }: ActorTypeaheadProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AdminUserRow[]>([])
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputId = useId()

  // Debounced search effect — fetches matches when the query stabilises.
  // setResults calls live inside the setTimeout's async closure (not the
  // effect body) so the react-hooks/set-state-in-effect rule stays happy.
  useEffect(() => {
    const trimmed = query.trim()
    const handle = setTimeout(() => {
      void (async () => {
        if (trimmed.length === 0) {
          setResults([])
          return
        }
        try {
          const res = await apiClient.get<ListUsersResponse>(
            "/api/v1/admin/users",
            { query: { q: trimmed } },
          )
          setResults((res.data?.items ?? []).slice(0, MAX_RESULTS))
        } catch (err) {
          // Soft fail — empty result; don't surface ApiError to the
          // filter UI. The page still renders with the unfiltered list.
          if (err instanceof ApiError) {
            setResults([])
            return
          }
          throw err
        }
      })()
    }, DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [query])

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  function pushWith(actor_id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (actor_id) {
      params.set("actor_id", actor_id)
    } else {
      params.delete("actor_id")
    }
    // Filter changes reset pagination to page 1.
    params.delete("page")
    startTransition(() => {
      router.push(`/admin/audit?${params.toString()}`)
    })
  }

  function selectUser(user: AdminUserRow) {
    setQuery(`${user.name} · ${user.email}`)
    setOpen(false)
    pushWith(user.id)
  }

  function clearActor() {
    setQuery("")
    setResults([])
    setOpen(false)
    pushWith(null)
  }

  const hasLockedActor = initialActor !== null && query === ""
  const displayValue = hasLockedActor
    ? `${initialActor.name} · ${initialActor.email}`
    : query

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={inputId}
        className="block text-xs font-medium text-muted-foreground"
      >
        Actor
      </label>
      <div className="relative mt-1">
        <Input
          id={inputId}
          type="search"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          placeholder="Name or email…"
          className="pr-8"
          autoComplete="off"
          disabled={pending}
        />
        {(query !== "" || hasLockedActor) && (
          <button
            type="button"
            onClick={clearActor}
            aria-label="Clear actor filter"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className={cn(
            "absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md",
          )}
        >
          {results.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => selectUser(user)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="block font-medium">{user.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {user.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
