// Single source of truth for brand identity. Edit this file to rebrand.
// No string literal of brand.name should appear anywhere else in the codebase.
// (ESLint rule no-brand-string-literal enforces this; allowlist: config/,
// templates/, legal/, translations/, docs/, tests/, e2e/.)
//
// The ESLint rule reads brand.name from this file at lint time. If you move
// it, update the candidates list in
// tooling/eslint-config/src/rules/no-brand-string-literal.mjs.

export const brand = {
  name: "AIRA",
  tagline: "ROOTS & REACH",
  // Substring of `tagline` rendered in `text-primary` on the landing hero.
  // First-match split; case-sensitive. If the substring doesn't appear in
  // `tagline`, the hero renders the tagline as plain text.
  taglineHighlight: "REACH",
  // Production identity. Postmark sender signature for airabynisarga.com
  // is a Sprint 0 follow-up — until DKIM/SPF lands, transactional email
  // falls back to the console driver (see packages/email/src/index.ts).
  supportEmail: "support@airabynisarga.com",
  socialHandle: "@airabynisarga",
  legalEntity: "Nisarga Group LLC",
  // Shortened parent-entity display used in auth shell footer ("AIRA by
  // Nisarga") and the marketing nav. Compose with brand.name as
  // `${brand.name} by ${brand.parentName}` so the no-brand-string-literal
  // ESLint rule keeps the brand.name literal contained to this file.
  parentName: "Nisarga",
  url: "https://airabynisarga.com",

  // Email-client-safe sRGB hex palette. Gmail, Outlook, and Yahoo do not
  // support oklch() in inline CSS, so React Email templates cannot import
  // design.colors directly. These are hand-tuned hex equivalents of
  // design.colors.light (see packages/config/src/design.ts). Keep in sync
  // when the design tokens change.
  //
  // `border` is the one deliberate divergence: design uses #C9B795 (3:1
  // warm tan on cream); emails read better with a softer separator.
  emailColors: {
    primary:           "#4F653B",  // oklch(0.46 0.07 132) — AIRA olive green
    primaryForeground: "#F3EBDD",  // oklch(0.94 0.02 80) — AIRA cream, AA-passing on green
    background:        "#EAE0CB",  // oklch(0.90 0.04 85) — page cream
    foreground:        "#3D2814",  // oklch(0.25 0.04 60) — warm dark brown
    muted:             "#E2D5BC",  // oklch(0.88 0.03 85)
    mutedForeground:   "#735239",  // oklch(0.45 0.04 60)
    border:            "#D8C9AC",  // softer than design.border for email
  },

  // /home (signed-in user landing) copy. These used to live as runtime-editable
  // app_setting rows (homepage_about_title / homepage_about_body) — they only
  // feed one screen and only change at fork time, so they belong in the
  // rebrand layer like the rest of the brand copy. Forks edit here; no DB
  // migration, no admin form.
  //
  // The Community Members stat card on /home used to read a static
  // `communityMembers` string from this block. It's now driven by the live
  // countCommunityMembersOp (end_user role, not banned, not anonymized) so
  // both surfaces render a real number. Forks that want a static override
  // can wrap the fetch in their own branch — none in-template do.
  homepage: {
    aboutTitle: "Atlanta's Indian business directory, curated with care",
    aboutBody:
      "AIRA is Atlanta's premier community directory connecting the Indian community with local Indian businesses, services, and resources.",
  },
} as const

export type Brand = typeof brand
