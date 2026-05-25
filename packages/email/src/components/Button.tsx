// Branded CTA button for transactional emails. Wraps @react-email/components
// Button with theme.colors.primary / primaryForeground so every email gets
// the same on-brand call to action without per-template style duplication.

import { Button as REButton } from "@react-email/components"
import type { ReactNode } from "react"
import { theme } from "./theme"

export interface ButtonProps {
  href: string
  children: ReactNode
}

export function Button({ href, children }: ButtonProps) {
  return (
    <REButton
      href={href}
      style={{
        backgroundColor: theme.colors.primary,
        borderRadius: `${theme.size.radiusButton}px`,
        color: theme.colors.primaryForeground,
        display: "inline-block",
        fontSize: theme.textSize.body,
        fontWeight: 600,
        padding: "12px 24px",
        textDecoration: "none",
      }}
    >
      {children}
    </REButton>
  )
}
