// Design tokens — TS reflection of src/app/globals.css.
// shadcn's vocabulary is the source of truth (background/foreground/card/popover/
// primary/secondary/muted/accent/destructive/border/input/ring/chart/sidebar).
// MLabs additions: success, warning.
//
// Keep in sync with globals.css until v1.1 ships codegen. Values are OKLCH
// triplets (the raw CSS color, not wrapped — globals.css uses them directly).

export const design = {
  colors: {
    light: {
      background:           "oklch(1 0 0)",
      foreground:           "oklch(0.145 0 0)",
      card:                 "oklch(1 0 0)",
      cardForeground:       "oklch(0.145 0 0)",
      popover:              "oklch(1 0 0)",
      popoverForeground:    "oklch(0.145 0 0)",
      // MLabs orange (~#FF6B2C). White-on-orange is a deliberate brand
      // choice — it does not meet WCAG AA body text contrast (~2.6:1 vs
      // 4.5:1 required) but is preferred visually for the brand CTA. The
      // primaryForeground / primary pair is intentionally exempted from
      // the check-contrast guard; see scripts/check-contrast.ts.
      primary:              "oklch(0.69 0.18 39)",
      primaryForeground:    "oklch(0.985 0 0)",
      secondary:            "oklch(0.97 0 0)",
      secondaryForeground:  "oklch(0.205 0 0)",
      muted:                "oklch(0.97 0.003 80)",
      mutedForeground:      "oklch(0.48 0 0)",
      accent:               "oklch(0.97 0 0)",
      accentForeground:     "oklch(0.205 0 0)",
      destructive:          "oklch(0.577 0.245 27.325)",
      // Slightly warm light gray; passes 3:1 visibility against white.
      border:               "oklch(0.62 0.005 80)",
      input:                "oklch(0.62 0.005 80)",
      // Darker, more saturated brand orange for the focus ring so it
      // meets the 3:1 non-text contrast bar against white.
      ring:                 "oklch(0.62 0.19 39)",
      success:              "oklch(0.48 0.16 145)",
      successForeground:    "oklch(0.985 0 0)",
      warning:              "oklch(0.78 0.16 80)",
      warningForeground:    "oklch(0.205 0 0)",
    },
    dark: {
      // MLabs navy (~#0A0F1C). Card slightly lighter for surface separation.
      background:           "oklch(0.18 0.02 260)",
      foreground:           "oklch(0.985 0 0)",
      card:                 "oklch(0.22 0.03 260)",
      cardForeground:       "oklch(0.985 0 0)",
      popover:              "oklch(0.22 0.03 260)",
      popoverForeground:    "oklch(0.985 0 0)",
      // Same brand orange in dark mode; white foreground matches light
      // theme (deliberate AA exemption — see light-theme comment above).
      primary:              "oklch(0.69 0.18 39)",
      primaryForeground:    "oklch(0.985 0 0)",
      secondary:            "oklch(0.27 0.02 260)",
      secondaryForeground:  "oklch(0.985 0 0)",
      muted:                "oklch(0.27 0.02 260)",
      mutedForeground:      "oklch(0.708 0 0)",
      accent:               "oklch(0.27 0.02 260)",
      accentForeground:     "oklch(0.985 0 0)",
      destructive:          "oklch(0.704 0.191 22.216)",
      border:               "oklch(1 0 0 / 35%)",
      input:                "oklch(1 0 0 / 40%)",
      ring:                 "oklch(0.69 0.18 39)",
      success:              "oklch(0.7 0.18 145)",
      successForeground:    "oklch(0.145 0 0)",
      warning:              "oklch(0.82 0.16 80)",
      warningForeground:    "oklch(0.145 0 0)",
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
    sans:    "var(--font-inter), system-ui, sans-serif",
    display: "var(--font-inter), system-ui, sans-serif",
    mono:    "var(--font-jetbrains-mono), ui-monospace, monospace",
  },

  // shadcn drives radius from a single --radius var; sm/md/lg/xl derive via calc()
  radius: {
    base: "0.625rem",
    sm:   "calc(0.625rem * 0.6)",
    md:   "calc(0.625rem * 0.8)",
    lg:   "0.625rem",
    xl:   "calc(0.625rem * 1.4)",
    "2xl":"calc(0.625rem * 1.8)",
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
