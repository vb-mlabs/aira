// /admin/users/[id] — full user detail + role/ban/notify controls + scoped audit.

import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/auth/server"
import { getUserDetail } from "@/features/admin/server/queries"
import { UserDetail } from "@/features/admin"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const admin = await requireAdmin()
  const { id } = await params
  const detail = await getUserDetail(id)
  if (!detail) notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to users
      </Link>
      <UserDetail user={detail.user} audit={detail.audit} selfId={admin.id} />
    </div>
  )
}
