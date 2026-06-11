import Link from "next/link"
import { AdminBadge } from "./admin-badge"
import type { AdminUserRow } from "@/features/admin/types"

export function UserRow({ user }: { user: AdminUserRow }) {
  const banned = !!user.banned_at

  return (
    <tr className="hover:bg-muted/20">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/users/${user.id}`}
            className="font-medium text-primary hover:underline"
          >
            {user.name}
          </Link>
          {user.role === "admin" && (
            <AdminBadge variant="admin" label="Admin" />
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
      <td className="px-4 py-3">
        {user.email_verified ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <AdminBadge variant="unverified" label="Unverified" />
        )}
      </td>
      <td className="px-4 py-3">
        <AdminBadge variant={banned ? "banned" : "active"} label={banned ? "Banned" : "Active"} />
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
    </tr>
  )
}
