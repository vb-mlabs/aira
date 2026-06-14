"use client"

// F20 v2 — inline respondent expander for the admin queue.
//
// Toggle button shows the count + view/hide. First expand fires GET
// /api/v1/admin/community/posts/<id>/interests; result is cached in
// local state so subsequent toggles render without another round-trip.

import { useState, useTransition } from "react"
import { ChevronDown, ChevronUp, Users } from "lucide-react"
import { ApiError } from "@aira/api"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"
import type { InterestRow } from "@aira/validators/community"

interface RespondentListProps {
  postId: string
  interestCount: number
}

export function RespondentList({ postId, interestCount }: RespondentListProps) {
  const [expanded, setExpanded] = useState(false)
  const [items, setItems] = useState<InterestRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (interestCount === 0) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5" aria-hidden />
        No respondents yet.
      </p>
    )
  }

  function toggle() {
    if (expanded) {
      setExpanded(false)
      return
    }
    if (items !== null) {
      setExpanded(true)
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const res = await apiClient.get<{ items: InterestRow[] }>(
          `/api/v1/admin/community/posts/${encodeURIComponent(postId)}/interests`,
        )
        setItems(res.data?.items ?? [])
        setExpanded(true)
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Couldn't load respondents.",
        )
      }
    })
  }

  const ChevIcon = expanded ? ChevronUp : ChevronDown

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
          "text-muted-foreground hover:bg-accent hover:text-foreground",
          "disabled:opacity-60",
        )}
      >
        <Users className="size-3.5" aria-hidden />
        {interestCount === 1 ? "1 offered to help" : `${interestCount} offered to help`}
        <span aria-hidden>·</span>
        {pending ? "loading…" : expanded ? "hide" : "view"}
        <ChevIcon className="size-3.5" aria-hidden />
      </button>

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {expanded && items !== null && (
        <ul className="mt-3 space-y-3 rounded-md bg-background/50 px-4 py-3">
          {items.length === 0 ? (
            <li className="text-xs text-muted-foreground">No respondents yet.</li>
          ) : (
            items.map((r) => (
              <li key={r.id}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold leading-tight">
                    {r.responder_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {relativeTime(r.created_at)}
                  </p>
                </div>
                {r.message ? (
                  <p className="mt-1 text-sm leading-relaxed">{r.message}</p>
                ) : (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    No note attached.
                  </p>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}
