// Design tokens — TS reflection of src/app/globals.css.
// shadcn's vocabulary is the source of truth (background/foreground/card/popover/
// primary/secondary/muted/accent/destructive/border/input/ring/chart/sidebar).
// AIRA additions: success, warning, tier1/tier2/tier3, brandCreamBright/Muted,
// brandGold, info.
//
// Keep in sync with globals.css until v1.1 ships codegen. Values are OKLCH
// triplets (the raw CSS color, not wrapped — globals.css uses them directly).
//
// AIRA palette anchors (Figma source of truth — see .mstack/design-system/DESIGN.md):
//   Olive green primary: #4F653B → oklch(0.46 0.07 132)
//   Brand cream bright:  #F3EBDD → oklch(0.94 0.02 80)
//   Brass gold accent:   #B8904A → oklch(0.66 0.10 80)
//   Page cream bg:       #EAE0CB → oklch(0.90 0.04 85)  (eyedropped)
//   Text brown:          #3D2814 → oklch(0.25 0.04 60)  (eyedropped)

export const design = {
  colors: {
    light: {
      // Warm cream paper aesthetic — there is no white in this brand.
      background:           "oklch(0.90 0.04 85)",
      foreground:           "oklch(0.25 0.04 60)",
      card:                 "oklch(0.94 0.02 80)",  // #F3EBDD
      cardForeground:       "oklch(0.25 0.04 60)",
      popover:              "oklch(0.95 0.02 85)",
      popoverForeground:    "oklch(0.25 0.04 60)",
      // AIRA olive green (~#4F653B). Cream-on-green passes AA body (~4.65:1).
      // Used for primary CTAs, tier-1 sponsorship, focus rings, "Active" nav.
      primary:              "oklch(0.46 0.07 132)",
      primaryForeground:    "oklch(0.94 0.02 80)",
      secondary:            "oklch(0.93 0.03 85)",
      secondaryForeground:  "oklch(0.25 0.04 60)",
      muted:                "oklch(0.88 0.03 85)",
      mutedForeground:      "oklch(0.45 0.04 60)",
      accent:               "oklch(0.95 0.02 85)",
      accentForeground:     "oklch(0.25 0.04 60)",
      destructive:          "oklch(0.55 0.22 27)",
      // Deep warm tan border; passes 3:1 against the cream bg.
      border:               "oklch(0.50 0.07 80)",
      input:                "oklch(0.50 0.07 80)",
      // Olive green focus ring — same as primary, matches the CTA palette.
      ring:                 "oklch(0.46 0.07 132)",
      // Success reuses the primary olive green; cream foreground.
      success:              "oklch(0.46 0.07 132)",
      successForeground:    "oklch(0.94 0.02 80)",
      // Warning is the burnt orange, but with DEEP BROWN foreground so the
      // generic warning treatment (toasts / form warnings) passes AA body.
      // The cream-on-orange look from Figma lives on `tier2` (deliberate
      // AA-Large exemption documented in scripts/check-contrast.ts).
      warning:              "oklch(0.62 0.13 55)",
      warningForeground:    "oklch(0.20 0.03 60)",

      // ---------- AIRA extensions ----------

      // Semantic tier system: used for sponsorship tiers in listings AND
      // for category hierarchy levels per PRD § Style Tokens. Same palette,
      // two semantic axes.
      tier1:                "oklch(0.46 0.07 132)",  // olive green — Sponsored Top / Category L0
      tier1Foreground:      "oklch(0.94 0.02 80)",
      tier2:                "oklch(0.62 0.13 55)",   // burnt orange — Sponsored Mid / Category L1
      // cream-on-burnt-orange is ~2.7:1; deliberate AA-Large exemption.
      // Tier headers are bold 14px+ Lato — qualifies as Large by WCAG.
      // See scripts/check-contrast.ts allowlist + DESIGN.md.
      tier2Foreground:      "oklch(0.94 0.02 80)",
      tier3:                "oklch(0.43 0.09 55)",   // chocolate brown — Regular / Category L2
      tier3Foreground:      "oklch(0.94 0.02 80)",

      // Brand cream variants (used on dark surfaces — sidebar, footer cards).
      // These differ from `background` (page cream) on purpose.
      brandCreamBright:     "oklch(0.94 0.02 80)",   // #F3EBDD — text on dark
      brandCreamMuted:      "oklch(0.90 0.04 80)",   // #E9DDC7 — secondary on dark

      // Rare ornamental brass — used for hairline dividers in dark surfaces.
      // Not a button fill color.
      brandGold:            "oklch(0.66 0.10 80)",   // #B8904A

      // Verified badge — small icon-on-pill, not text. Renders on the
      // listing card. Darker than Figma's bright sky to clear AA-Large
      // (3:1) against white icon foreground.
      info:                 "oklch(0.55 0.18 240)",
      infoForeground:       "oklch(0.985 0 0)",
    },
    dark: {
      // Extrapolated dark mode — coffee/leather warm darks rather than navy.
      // Marked as design-system extrapolation; needs client review before
      // shipping dark theme to production.
      background:           "oklch(0.18 0.03 60)",
      foreground:           "oklch(0.94 0.02 80)",
      card:                 "oklch(0.22 0.03 60)",
      cardForeground:       "oklch(0.94 0.02 80)",
      popover:              "oklch(0.22 0.03 60)",
      popoverForeground:    "oklch(0.94 0.02 80)",
      // Same olive as light theme — keeps cream-on-green AA at 4.5:1.
      // Brightening for dark visibility was tempting but broke the
      // primary button contrast; the dark surround makes 0.46 olive
      // pop just fine.
      primary:              "oklch(0.46 0.07 132)",
      primaryForeground:    "oklch(0.94 0.02 80)",
      secondary:            "oklch(0.28 0.03 60)",
      secondaryForeground:  "oklch(0.94 0.02 80)",
      muted:                "oklch(0.28 0.03 60)",
      mutedForeground:      "oklch(0.70 0.04 80)",
      accent:               "oklch(0.28 0.03 60)",
      accentForeground:     "oklch(0.94 0.02 80)",
      destructive:          "oklch(0.65 0.20 27)",
      // Cream hairlines on dark surfaces — strong alpha so they clear the
      // 3:1 visibility bar after compositing on the dark warm bg.
      border:               "oklch(0.94 0.02 80 / 50%)",
      input:                "oklch(0.94 0.02 80 / 45%)",
      // Brighter ring on dark so focus state pops against the dark bg
      // (light theme can use the darker primary value because the cream
      // bg gives it natural contrast).
      ring:                 "oklch(0.62 0.10 132)",
      success:              "oklch(0.46 0.07 132)",
      successForeground:    "oklch(0.94 0.02 80)",
      warning:              "oklch(0.72 0.13 55)",
      warningForeground:    "oklch(0.18 0.03 60)",

      // AIRA extensions (dark variants)
      tier1:                "oklch(0.46 0.07 132)",
      tier1Foreground:      "oklch(0.94 0.02 80)",
      // Darker burnt orange on dark to keep tier2 within AA-Large (3:1)
      // when paired with cream foreground.
      tier2:                "oklch(0.55 0.13 55)",
      tier2Foreground:      "oklch(0.94 0.02 80)",
      tier3:                "oklch(0.52 0.09 55)",
      tier3Foreground:      "oklch(0.94 0.02 80)",
      brandCreamBright:     "oklch(0.94 0.02 80)",
      brandCreamMuted:      "oklch(0.86 0.04 80)",
      brandGold:            "oklch(0.74 0.10 80)",
      info:                 "oklch(0.55 0.18 240)",
      infoForeground:       "oklch(0.985 0 0)",
    },
  },

  type: {
    xs:    { size: "0.75rem",  line: "1rem"     },
    sm:    { size: "0.875rem", line: "1.25rem"  },
    base:  { size: "1rem",     line: "1.5rem"   },
    lg:    { size: "1.125rem", line: "1.75rem"  },
    xl:    { size: "1.25rem",  line: "1.75rem"  },
    "2xl": { size: "1.5rem",   line: "2rem"     },
    "3xl": { size: "1.875rem", line: "2.25rem"  },
    "4xl": { size: "2.25rem",  line: "2.5rem"   },
  },

  fonts: {
    // Lato (humanist sans, 400/600/700) — body + all UI.
    sans:    "var(--font-lato), system-ui, sans-serif",
    // Cormorant Garamond (transitional serif, 600/700) — headings + wordmark.
    display: "var(--font-cormorant-garamond), Georgia, serif",
    mono:    "var(--font-jetbrains-mono), ui-monospace, monospace",
  },

  // shadcn drives radius from a single --radius var; sm/md/lg/xl derive via calc()
  // Base bumped from 0.625rem to 0.875rem (14px) to match Figma nav-item radius.
  radius: {
    base: "0.875rem",
    sm:   "calc(0.875rem * 0.6)",
    md:   "calc(0.875rem * 0.8)",
    lg:   "0.875rem",
    xl:   "calc(0.875rem * 1.4)",
    "2xl":"calc(0.875rem * 1.8)",
    full: "9999px",
  },

  motion: {
    durations: {
      instant: "75ms",
      fast:    "150ms",
      normal:  "250ms",
      slow:    "400ms",
    },
    easings: {
      out:   "cubic-bezier(0.16, 1, 0.3, 1)",
      in:    "cubic-bezier(0.7, 0, 0.84, 0)",
      inOut: "cubic-bezier(0.83, 0, 0.17, 1)",
    },
  },
} as const

export type Design = typeof design
