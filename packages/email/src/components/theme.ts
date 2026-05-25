// Flat theme tokens for React Email components. Re-exports brand.emailColors
// from @mlabs/config plus spacing/radius constants tuned for email layout
// (cards in inboxes read better with slightly more generous spacing than
// on-screen UI).

import { brand } from "@mlabs/config"

export const theme = {
  colors: brand.emailColors,
  font: {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  size: {
    container: 600,        // standard email body width
    padding: 32,
    paddingTight: 16,
    radius: 8,
    radiusButton: 6,
  },
  textSize: {
    body: "16px",
    small: "14px",
    heading: "24px",
    footer: "12px",
  },
} as const

export type Theme = typeof theme
