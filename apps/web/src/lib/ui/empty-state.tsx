// EmptyState — every list view renders this when data is empty.
// Per Design Principle 1: "No items found." is not a design.
// Always: warmth + a primary action + context.

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@mlabs/ui-web/button"

interface Action {
  label: string
  href?: string
  onClick?: () => void
}

interface EmptyStateProps {
  /** Lucide icon shown above the title. Optional but recommended. */
  icon?: LucideIcon
  title: string
  description?: string
  action?: Action
  /** Secondary action — rendered as outline button. */
  secondaryAction?: Action
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {Icon && (
        <div
          aria-hidden
          className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {action && <ActionButton action={action} />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="outline" />}
        </div>
      )}
    </div>
  )
}

function ActionButton({
  action,
  variant = "default",
}: {
  action: Action
  variant?: "default" | "outline"
}) {
  if (action.href) {
    return (
      <Button variant={variant}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    )
  }
  return (
    <Button variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  )
}
