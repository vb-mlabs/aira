import { apiServerFetch } from "@aira/api/server"
import { listUsersOp } from "@/server/operations/admin"
import { UserList } from "@/features/admin"
import { AdminPageHeader } from "../_components/page-header"
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
    params.role === "admin" || params.role === "end_user" ? params.role : "all"
  const banned =
    params.banned === "banned" || params.banned === "active"
      ? params.banned
      : "all"

  const pageNum = Number.parseInt(params.page ?? "1", 10)
  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1

  const res = await apiServerFetch(listUsersOp, {
    input: { q: params.q, role, banned, page },
  })
  const result = res.data!

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        subtitle="Search, filter, and manage accounts."
      />
      <UserList
        items={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
      />
    </div>
  )
}
