"use client"

// F22 — composite filter bar for /admin/audit. Composes:
//   - Date range (since / until) inputs
//   - Actor typeahead (separate client component)
//   - Target-type select (closed dropdown of KNOWN_AUDIT_TARGET_TYPES)
//   - Action select (closed dropdown of KNOWN_AUDIT_ACTIONS grouped by
//     domain via <optgroup>s; labels via auditActionLabel())
//   - Clear-all button
//
// URL-driven: each control writes its own param on change via
// router.push. Filter changes reset pagination to page 1.

import { useId, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  KNOWN_AUDIT_ACTIONS,
  KNOWN_AUDIT_TARGET_TYPES,
  auditActionDomain,
  auditActionLabel,
  type KnownAuditAction,
  type KnownAuditTargetType,
} from "@aira/validators/audit-meta"
import { ActorTypeahead } from "./actor-typeahead"

interface FilterBarProps {
  initialActor: { id: string; name: string; email: string } | null
  currentSince: string | null
  currentUntil: string | null
  currentTargetType: KnownAuditTargetType | null
  currentAction: KnownAuditAction | null
}

const DOMAIN_LABELS: Record<string, string> = {
  user: "User events",
  business: "Business events",
  community: "Community events",
  app_setting: "Settings events",
  session: "Session events",
}

function groupActionsByDomain() {
  const groups = new Map<string, KnownAuditAction[]>()
  for (const action of KNOWN_AUDIT_ACTIONS) {
    const domain = auditActionDomain(action)
    const list = groups.get(domain) ?? []
    list.push(action)
    groups.set(domain, list)
  }
  return Array.from(groups.entries())
}

const ACTION_GROUPS = groupActionsByDomain()

export function FilterBar({
  initialActor,
  currentSince,
  currentUntil,
  currentTargetType,
  currentAction,
}: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sinceId = useId()
  const untilId = useId()
  const targetTypeId = useId()
  const actionId = useId()
  const [pending, startTransition] = useTransition()

  function pushWith(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    // Filter changes always reset pagination.
    params.delete("page")
    startTransition(() => {
      router.push(`/admin/audit?${params.toString()}`)
    })
  }

  function clearAll() {
    startTransition(() => {
      router.push(`/admin/audit`)
    })
  }

  const hasAnyFilter =
    currentSince !== null ||
    currentUntil !== null ||
    initialActor !== null ||
    currentTargetType !== null ||
    currentAction !== null

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
      <div className="space-y-1">
        <label htmlFor={sinceId} className="block text-xs text-muted-foreground">
          From
        </label>
        <input
          id={sinceId}
          name="since"
          type="date"
          defaultValue={currentSince ?? ""}
          disabled={pending}
          onChange={(e) => pushWith({ since: e.target.value || null })}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={untilId} className="block text-xs text-muted-foreground">
          To
        </label>
        <input
          id={untilId}
          name="until"
          type="date"
          defaultValue={currentUntil ?? ""}
          disabled={pending}
          onChange={(e) => pushWith({ until: e.target.value || null })}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        />
      </div>

      <div className="min-w-[220px] flex-1">
        <ActorTypeahead initialActor={initialActor} />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={targetTypeId}
          className="block text-xs text-muted-foreground"
        >
          Target type
        </label>
        <select
          id={targetTypeId}
          value={currentTargetType ?? ""}
          disabled={pending}
          onChange={(e) =>
            pushWith({ target_type: e.target.value || null })
          }
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {KNOWN_AUDIT_TARGET_TYPES.map((tt) => (
            <option key={tt} value={tt}>
              {tt}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor={actionId} className="block text-xs text-muted-foreground">
          Action
        </label>
        <select
          id={actionId}
          value={currentAction ?? ""}
          disabled={pending}
          onChange={(e) => pushWith({ action: e.target.value || null })}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {ACTION_GROUPS.map(([domain, actions]) => (
            <optgroup
              key={domain}
              label={DOMAIN_LABELS[domain] ?? `${domain} events`}
            >
              {actions.map((action) => (
                <option key={action} value={action}>
                  {auditActionLabel(action)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {hasAnyFilter && (
        <button
          type="button"
          onClick={clearAll}
          disabled={pending}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
