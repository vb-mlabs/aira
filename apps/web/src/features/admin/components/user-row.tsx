import Link from "next/link"
import { AdminBadge } from "./admin-badge"
import type { AdminUserRow } from "@/features/admin/types"

export function UserRow({ user }: { user: AdminUserRow }) {
  const banned = !!user.banned_at

  return (
    <tr className="relative cursor-pointer hover:bg-muted/20">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* after:* pseudo-element stretches the link across the entire
              row so any cell click navigates to the detail page. The
              <Link> stays in the DOM for keyboard + screen-reader
              navigation. Mirrors the businesses + community + renewals
              admin tables. */}
          <Link
            href={`/admin/users/${user.id}`}
            className="font-medium text-foreground after:absolute after:inset-0 after:content-['']"
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
