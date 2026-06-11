import { cn } from "@aira/ui-web/utils"

export type AdminBadgeVariant =
  | "active" | "inactive" | "archived"
  | "paid" | "pending" | "overdue"
  | "running" | "succeeded" | "failed" | "skipped"
  | "admin" | "banned" | "unverified"

const STYLES: Record<AdminBadgeVariant, string> = {
  active:     "bg-success/15 text-success",
  inactive:   "bg-muted text-muted-foreground",
  archived:   "bg-muted text-muted-foreground",
  paid:       "bg-success/15 text-success",
  pending:    "bg-warning/15 text-warning",
  overdue:    "bg-destructive/15 text-destructive",
  running:    "bg-info/15 text-info",
  succeeded:  "bg-success/15 text-success",
  failed:     "bg-destructive/15 text-destructive",
  skipped:    "bg-muted text-muted-foreground",
  admin:      "bg-primary/10 text-primary",
  banned:     "bg-destructive/10 text-destructive",
  unverified: "bg-muted text-muted-foreground",
}

interface AdminBadgeProps {
  variant: AdminBadgeVariant
  label: string
  className?: string
}

export function AdminBadge({ variant, label, className }: AdminBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[variant],
        className,
      )}
    >
      {label}
    </span>
  )
}
