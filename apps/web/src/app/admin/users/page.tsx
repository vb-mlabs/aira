// /admin/users — list with search + filter + pagination. Server-renders the
// page from the URL search params; the UserList client component pushes new
// params to navigate.

import { listUsers } from "@/features/admin/server/queries"
import { UserList } from "@/features/admin"
import type { UserRole } from "@/features/admin/types"

export const metadata = { title: "Admin · Users" }
export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    q?: string
    role?: string
    banned?: string
    page?: string
  }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams

  const role: UserRole | "all" =
    params.role === "admin" || params.role === "user" ? params.role : "all"
  const banned =
    params.banned === "banned" || params.banned === "active"
      ? params.banned
      : "all"

  const pageNum = Number.parseInt(params.page ?? "1", 10)
  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1

  const result = await listUsers({
    q: params.q,
    role,
    banned,
    page,
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, filter, and manage accounts.
        </p>
      </header>
      <UserList
        items={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
      />
    </div>
  )
}
