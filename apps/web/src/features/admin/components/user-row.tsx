import Link from "next/link"
import { cn } from "@mlabs/ui-web/utils"
import type { AdminUserRow } from "@/features/admin/types"

interface UserRowProps {
  user: AdminUserRow
}

export function UserRow({ user }: UserRowProps) {
  const banned = !!user.banned_at
  const isAdmin = user.role === "admin"

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-accent",
        banned && "border-destructive/40 bg-destructive/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{user.name}</p>
          {isAdmin && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary">
              admin
            </span>
          )}
          {banned && (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-destructive">
              banned
            </span>
          )}
          {!user.email_verified && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
              unverified
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {user.email}
        </p>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">
        {new Date(user.created_at).toLocaleDateString()}
      </p>
    </Link>
  )
}
