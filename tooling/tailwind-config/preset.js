// @mlabs/tailwind-config — Tailwind preset built from @mlabs/config/design.
//
// Shape is Tailwind v3 (`{ theme: { extend: { ... } } }`) because that's what
// NativeWind requires on mobile. Tailwind v4 on web reads tokens via the
// CSS-first `@theme` directive (in apps/web globals.css) — that mirrors the
// same source via codegen, so both apps stay aligned without consuming this
// preset directly.
//
// This package will be wired into the mobile config in Phase 6 (apps/mobile
// rewire). Until then it lives as a published-but-unconsumed module so forks
// can opt in.

import { design } from "@mlabs/config/design"

function colors() {
  const out = {}
  for (const [key, value] of Object.entries(design.colors.light)) {
    out[key] = value
  }
  for (const [key, value] of Object.entries(design.colors.dark)) {
    out[`${key}Dark`] = value
  }
  return out
}

function fontSize() {
  const out = {}
  for (const [name, val] of Object.entries(design.type)) {
    out[name] = [val.size, { lineHeight: val.line }]
  }
  return out
}

/** @type {import('tailwindcss').Config} */
const preset = {
  theme: {
    extend: {
      colors: colors(),
      fontSize: fontSize(),
      borderRadius: design.radius,
      fontFamily: {
        sans: ["Geist", "System"],
        display: ["Geist", "System"],
        mono: ["GeistMono", "Menlo"],
      },
    },
  },
  plugins: [],
}

export default preset
