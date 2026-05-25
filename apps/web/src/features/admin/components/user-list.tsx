"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@mlabs/ui-web/button"
import { Input } from "@mlabs/ui-web/input"
import { DataList, EmptyState } from "@/lib/ui"
import { UserRow } from "./user-row"
import type { AdminUserRow } from "@/features/admin/types"

interface UserListProps {
  items: AdminUserRow[]
  total: number
  page: number
  pageSize: number
}

// Search + filter bar (client-driven URL state) + paginated list.
// Page is server-rendered from search params; this component just
// pushes new params and lets the server re-fetch.
export function UserList({ items, total, page, pageSize }: UserListProps) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [q, setQ] = useState(params.get("q") ?? "")

  function navigateWith(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k)
      else next.set(k, v)
    }
    // Reset to page 1 on any non-page change.
    if (!("page" in updates)) next.delete("page")
    startTransition(() => router.push(`/admin/users?${next.toString()}`))
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          navigateWith({ q: q.trim() || null })
        }}
        className="flex gap-2"
      >
        <Input
          aria-label="Search users"
          placeholder="Search name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={pending}>
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <FilterPills
          label="Role"
          value={params.get("role") ?? "all"}
          options={[
            { value: "all", label: "All" },
            { value: "admin", label: "Admin" },
            { value: "user", label: "User" },
          ]}
          onSelect={(v) => navigateWith({ role: v === "all" ? null : v })}
        />
        <FilterPills
          label="Status"
          value={params.get("banned") ?? "all"}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "banned", label: "Banned" },
          ]}
          onSelect={(v) => navigateWith({ banned: v === "all" ? null : v })}
        />
        <p className="ml-auto text-muted-foreground">
          {total.toLocaleString()} user{total === 1 ? "" : "s"}
        </p>
      </div>

      <DataList
        data={items}
        loading={false}
        error={null}
        keyExtractor={(u) => u.id}
        empty={
          <EmptyState
            title="No users match"
            description="Try a different search or clear filters."
          />
        }
        renderItem={(user) => <UserRow user={user} />}
      />

      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1 || pending}
            onClick={() =>
              navigateWith({ page: page > 2 ? String(page - 1) : null })
            }
          >
            Previous
          </Button>
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages || pending}
            onClick={() => navigateWith({ page: String(page + 1) })}
          >
            Next
          </Button>
        </nav>
      )}

      <p className="text-xs text-muted-foreground">
        <Link
          href="/admin/audit"
          className="underline hover:text-foreground"
        >
          View full audit log →
        </Link>
      </p>
    </div>
  )
}

function FilterPills({
  label,
  value,
  options,
  onSelect,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onSelect: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={
            "rounded-full border px-2 py-0.5 " +
            (value === opt.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
