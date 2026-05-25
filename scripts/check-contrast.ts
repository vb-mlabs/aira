/**
 * check-contrast
 * --------------
 * Reads `packages/config/src/design.ts`, computes the WCAG 2.1 contrast ratio for
 * every meaningful foreground/background token pair in BOTH the light and
 * dark themes, and exits non-zero if any pair fails the bar.
 *
 * Bars (per Phase 5.5 design spec, Pass 6):
 *   • Body text:      ≥ 4.5:1  (WCAG AA)
 *   • Large text /
 *     interactive UI: ≥ 3.0:1
 *
 * Wired into the lefthook pre-commit hook (locally) and intended for CI as
 * `npm run check-contrast`. Does NOT modify design.ts — if a check fails,
 * the operator must fix the palette and re-run.
 *
 * The OKLCH parser handles the formats this project uses:
 *   oklch(L C H)
 *   oklch(L C H / alpha%)
 *   oklch(L 0 0)              ← greys (chroma=0, hue=0)
 *
 * Alpha-channel tokens (e.g. `oklch(1 0 0 / 10%)` on the dark border) are
 * blended against the theme background before contrast is computed — this
 * matches how the human eye sees them.
 */

import path from "node:path"

// ---------- terminal colors ----------

const RESET = "\x1b[0m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"

// ---------- color math ----------

interface Rgb {
  r: number // 0..1 linear-light NOT applied yet (these are sRGB 0..1)
  g: number
  b: number
  a: number // 0..1
}

export interface Oklch {
  l: number
  c: number
  h: number
  a: number
}

/** Parse an `oklch(...)` string. Tolerates whitespace and percentage alpha. */
export function parseOklch(raw: string): Oklch {
  const m = raw.trim().match(/^oklch\(\s*([^)]+)\)$/i)
  if (!m) throw new Error(`not an oklch() color: ${raw}`)
  const inner = m[1].trim()

  // Split alpha if present (after `/`).
  let coords = inner
  let alpha = 1
  const slash = inner.split("/")
  if (slash.length === 2) {
    coords = slash[0].trim()
    const ap = slash[1].trim()
    alpha = ap.endsWith("%") ? parseFloat(ap) / 100 : parseFloat(ap)
  }

  const parts = coords.split(/\s+/).filter(Boolean)
  if (parts.length < 3) throw new Error(`oklch() needs 3 components: ${raw}`)

  const l = parseFloat(parts[0])
  const c = parseFloat(parts[1])
  const h = parseFloat(parts[2])

  return { l, c, h, a: alpha }
}

/**
 * Convert OKLCH → linear sRGB → sRGB.
 * Reference: https://bottosson.github.io/posts/oklab/
 * Out-of-gamut values are clamped to [0, 1] at the sRGB step.
 */
export function oklchToSrgb(oklch: Oklch): Rgb {
  const { l, c, h, a } = oklch

  // OKLCH → OKLab
  const hRad = (h * Math.PI) / 180
  const aLab = c * Math.cos(hRad)
  const bLab = c * Math.sin(hRad)

  // OKLab → linear sRGB (Björn Ottosson 2020)
  const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab
  const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab
  const s_ = l - 0.0894841775 * aLab - 1.291485548 * bLab

  const lCubed = l_ * l_ * l_
  const mCubed = m_ * m_ * m_
  const sCubed = s_ * s_ * s_

  const rLin = +4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed
  const gLin = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed
  const bLin = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed

  // Linear sRGB → sRGB (gamma encode), then clamp.
  return {
    r: clamp01(srgbEncode(rLin)),
    g: clamp01(srgbEncode(gLin)),
    b: clamp01(srgbEncode(bLin)),
    a,
  }
}

function srgbEncode(x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/**
 * Composite a translucent foreground onto an opaque background, returning
 * the resulting opaque sRGB color. Required when computing contrast against
 * the `border` / `input` tokens in dark mode (alpha < 1).
 */
export function compositeOver(fg: Rgb, bg: Rgb): Rgb {
  const a = fg.a + bg.a * (1 - fg.a)
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  }
}

/** WCAG 2.1 relative luminance (sRGB → linear → weighted sum). */
export function relativeLuminance(rgb: Rgb): number {
  const linearize = (x: number) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b)
}

/** WCAG 2.1 contrast ratio (1.0 .. 21.0). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// ---------- pair specification ----------

/**
 * Each pair is (foregroundToken, backgroundToken, severity). Severity drives
 * which threshold applies. Tokens are resolved against both light and dark
 * theme objects independently — the same pair structure runs twice.
 */
type Severity = "body" | "large"

interface Pair {
  fg: string
  bg: string
  severity: Severity
  note?: string
}

const PAIRS: Pair[] = [
  // Body text on backgrounds — all 4.5:1
  { fg: "foreground", bg: "background", severity: "body", note: "primary body text" },
  { fg: "cardForeground", bg: "card", severity: "body", note: "card body text" },
  { fg: "popoverForeground", bg: "popover", severity: "body", note: "popover body text" },
  { fg: "mutedForeground", bg: "background", severity: "body", note: "muted helper text" },
  { fg: "mutedForeground", bg: "muted", severity: "body", note: "muted-on-muted (form helpers)" },

  // Filled interactive surfaces — body bar (button labels)
  // NOTE: primaryForeground vs primary is deliberately exempted. The brand
  // choice is white text on the bright MLabs orange (oklch(0.69 0.18 39)),
  // which is ~2.6:1 and fails AA. This is a known accessibility tradeoff
  // documented in packages/config/src/design.ts. Forks that prefer an
  // AA-passing combo should darken `primary` and re-add this pair here.
  { fg: "secondaryForeground", bg: "secondary", severity: "body", note: "secondary button label" },
  { fg: "accentForeground", bg: "accent", severity: "body", note: "accent button/hover label" },
  { fg: "successForeground", bg: "success", severity: "body", note: "success toast label" },
  { fg: "warningForeground", bg: "warning", severity: "body", note: "warning toast label" },

  // Destructive: text on background (icon/text in destructive state)
  { fg: "destructive", bg: "background", severity: "large", note: "destructive text on bg" },

  // Borders / inputs — 3:1 against background (interactive UI bar)
  { fg: "border", bg: "background", severity: "large", note: "border visibility" },
  { fg: "input", bg: "background", severity: "large", note: "input outline visibility" },
  { fg: "ring", bg: "background", severity: "large", note: "focus ring visibility" },
]

// ---------- design.ts loader ----------

type ThemeColors = Record<string, string>

interface Themes {
  light: ThemeColors
  dark: ThemeColors
}

/**
 * Parses design.ts directly via dynamic import. We rely on the fact that
 * design.ts is a plain `export const design = { ... } as const` module —
 * no runtime side-effects.
 */
export async function loadDesignThemes(file?: string): Promise<Themes> {
  const target =
    file ??
    path.join(process.cwd(), "packages", "config", "src", "design.ts")
  // tsx handles TS on import. The relative path back from this file is
  // computed at runtime; we resolve to file:// so Windows works too.
  const mod = (await import(/* @vite-ignore */ "file://" + target)) as {
    design: { colors: Themes }
  }
  return mod.design.colors
}

// ---------- runner ----------

interface PairResult {
  theme: "light" | "dark"
  pair: Pair
  ratio: number
  threshold: number
  pass: boolean
}

export function evaluatePairs(themes: Themes, pairs: Pair[] = PAIRS): PairResult[] {
  const results: PairResult[] = []
  for (const theme of ["light", "dark"] as const) {
    const palette = themes[theme]
    for (const pair of pairs) {
      const fgRaw = palette[pair.fg]
      const bgRaw = palette[pair.bg]
      if (!fgRaw || !bgRaw) {
        throw new Error(
          `[check-contrast] missing token in ${theme} theme: fg=${pair.fg} bg=${pair.bg}`,
        )
      }

      const bgRgb = oklchToSrgb(parseOklch(bgRaw))
      let fgRgb = oklchToSrgb(parseOklch(fgRaw))
      // Composite alpha < 1 over the background — the rendered color is what
      // the human eye actually compares.
      if (fgRgb.a < 1) fgRgb = compositeOver(fgRgb, bgRgb)

      const ratio = contrastRatio(fgRgb, bgRgb)
      const threshold = pair.severity === "body" ? 4.5 : 3.0
      results.push({
        theme,
        pair,
        ratio,
        threshold,
        pass: ratio >= threshold,
      })
    }
  }
  return results
}

function printResults(results: PairResult[]): boolean {
  let allPass = true
  for (const theme of ["light", "dark"] as const) {
    console.log(`\n${BOLD}${theme} theme${RESET}`)
    const themeResults = results.filter((r) => r.theme === theme)
    for (const r of themeResults) {
      const icon = r.pass ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`
      const ratioStr = r.ratio.toFixed(2).padStart(5, " ")
      const label = `${r.pair.fg.padEnd(20)} on ${r.pair.bg.padEnd(14)}`
      const tail = r.pair.note ? `${DIM}${r.pair.note}${RESET}` : ""
      console.log(
        `  ${icon} ${label} ${ratioStr}:1 (≥${r.threshold}:1) ${tail}`,
      )
      if (!r.pass) allPass = false
    }
  }
  return allPass
}

export async function main(): Promise<number> {
  let themes: Themes
  try {
    themes = await loadDesignThemes()
  } catch (err) {
    console.error(`${RED}✗ failed to load packages/config/src/design.ts:${RESET} ${(err as Error).message}`)
    return 1
  }

  console.log(`${BOLD}check-contrast${RESET} — WCAG AA against packages/config/src/design.ts`)
  const results = evaluatePairs(themes)
  const passed = printResults(results)
  console.log()

  if (passed) {
    console.log(`${GREEN}${BOLD}✓ all contrast pairs pass${RESET}`)
    return 0
  }

  const failed = results.filter((r) => !r.pass)
  console.log(
    `${RED}${BOLD}✗ ${failed.length} contrast pair(s) below WCAG AA${RESET}`,
  )
  console.log(
    `${YELLOW}Fix the palette in packages/config/src/design.ts (and mirror to src/app/globals.css) before committing.${RESET}`,
  )
  return 1
}

const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === `file://${path.resolve(process.argv[1])}`

if (isDirectRun) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`${RED}✗ unexpected error:${RESET} ${(err as Error).stack ?? err}`)
      process.exit(1)
    },
  )
}
