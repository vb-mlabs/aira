// /admin/users/[id] — full user detail + role/ban/notify controls + scoped audit.

import Link from "next/link"
import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { requireAdmin } from "@/lib/auth/server"
import { getUserDetailOp } from "@/server/operations/admin"
import { UserDetail } from "@/features/admin"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  // requireAdmin() runs at the layout level too, but we need the admin's id
  // here for the self-action gate. apiServerFetch enforces the same gate
  // independently via the op's permission: "admin" + freshness check.
  // The caller's raw DB role drives the role-change UI gate inside
  // UserDetail — only super_admin sees the role-change buttons. The
  // changeRoleOp permission: "super_admin" is the security source of truth.
  const adminUser = await requireAdmin()
  const callerRole = (adminUser as { role?: string }).role ?? "admin"
  const { id } = await params
  const res = await apiServerFetch(getUserDetailOp, {
    input: { id },
    pathParams: { id },
  })
  const detail = res.data!
  if (!detail.user) notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to users
      </Link>
      <UserDetail
        user={detail.user}
        audit={detail.audit}
        selfId={adminUser.id}
        callerRole={callerRole}
      />
    </div>
  )
}
