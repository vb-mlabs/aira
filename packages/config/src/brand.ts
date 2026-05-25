// Single source of truth for brand identity. Edit this file to rebrand.
// No string literal of brand.name should appear anywhere else in the codebase.
// (ESLint rule no-brand-string-literal enforces this; allowlist: config/,
// templates/, legal/, translations/, docs/, tests/, e2e/.)
//
// The ESLint rule reads brand.name from this file at lint time. If you move
// it, update the candidates list in
// tooling/eslint-config/src/rules/no-brand-string-literal.mjs.

export const brand = {
  name: "MLabs Template",
  tagline: "AI engineering with guardrails, conventions, and a paper trail",
  // Substring of `tagline` rendered in `text-primary` on the landing hero.
  // First-match split; case-sensitive. If the substring doesn't appear in
  // `tagline`, the hero renders the tagline as plain text.
  taglineHighlight: "paper trail",
  supportEmail: "support@example.com",
  socialHandle: "@mlabs",
  legalEntity: "Million Labs Ltd",
  url: "https://example.com",

  // Email-client-safe sRGB hex palette. Gmail, Outlook, and Yahoo do not
  // support oklch() in inline CSS, so React Email templates cannot import
  // design.colors directly. These are hand-tuned hex equivalents of
  // design.colors.light (see packages/config/src/design.ts). Keep in sync
  // when the design tokens change.
  //
  // `border` is the one deliberate divergence: design uses ~#9C9C9C (3:1
  // on-screen visibility); emails read better with a softer separator.
  emailColors: {
    primary:           "#FF6B2C",  // oklch(0.69 0.18 39)
    primaryForeground: "#FFFFFF",  // oklch(0.985 0 0) — brand choice, AA-exempt (see design.ts)
    background:        "#FFFFFF",  // oklch(1 0 0)
    foreground:        "#1A1A1A",  // oklch(0.145 0 0)
    muted:             "#F5F5F5",  // oklch(0.97 0.003 80)
    mutedForeground:   "#7A7A7A",  // oklch(0.48 0 0)
    border:            "#E5E5E5",  // softer than design.border for email
  },
} as const

export type Brand = typeof brand
