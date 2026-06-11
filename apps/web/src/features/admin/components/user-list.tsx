"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { EmptyState } from "@/lib/ui"
import { UserRow } from "./user-row"
import type { AdminUserRow } from "@/features/admin/types"

interface UserListProps {
  items: AdminUserRow[]
  total: number
  page: number
  pageSize: number
}

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
    if (!("page" in updates)) next.delete("page")
    startTransition(() => router.push(`/admin/users?${next.toString()}`))
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      {/* Search */}
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

      {/* Filters */}
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
          {total.toLocaleString()} {total === 1 ? "user" : "users"}
        </p>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <EmptyState
          title="No users match"
          description="Try a different search term or clear the filters."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Verified</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || pending}
            onClick={() =>
              navigateWith({ page: page > 2 ? String(page - 1) : null })
            }
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || pending}
            onClick={() => navigateWith({ page: String(page + 1) })}
          >
            Next
          </Button>
        </nav>
      )}

      <p className="text-xs text-muted-foreground">
        <Link href="/admin/audit" className="underline hover:text-foreground">
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
            "rounded-full border px-2 py-0.5 text-xs transition-colors " +
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
