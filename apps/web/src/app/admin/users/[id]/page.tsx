// /admin/users/[id] — full user detail + role/ban/notify controls + scoped audit.

import Link from "next/link"
import { notFound } from "next/navigation"
import { admin as adminService } from "@aira/services"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth/server"
import { UserDetail } from "@/features/admin"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const adminUser = await requireAdmin()
  const { id } = await params
  // Bridge state T9 → T12. T12 swaps for apiServerFetch.
  const detail = await adminService.getUserDetail(db, id)
  if (!detail.user) notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to users
      </Link>
      <UserDetail user={detail.user} audit={detail.audit} selfId={adminUser.id} />
    </div>
  )
}
