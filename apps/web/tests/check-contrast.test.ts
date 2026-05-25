import { describe, expect, it } from "vitest"
import {
  contrastRatio,
  compositeOver,
  evaluatePairs,
  oklchToSrgb,
  parseOklch,
  relativeLuminance,
} from "../../../scripts/check-contrast"

// ---------- parser ----------

describe("parseOklch", () => {
  it("parses three coordinates", () => {
    const r = parseOklch("oklch(0.5 0.1 200)")
    expect(r.l).toBe(0.5)
    expect(r.c).toBe(0.1)
    expect(r.h).toBe(200)
    expect(r.a).toBe(1)
  })

  it("parses alpha as percentage", () => {
    const r = parseOklch("oklch(1 0 0 / 10%)")
    expect(r.l).toBe(1)
    expect(r.a).toBeCloseTo(0.1)
  })

  it("parses alpha as fraction", () => {
    const r = parseOklch("oklch(0.5 0 0 / 0.25)")
    expect(r.a).toBeCloseTo(0.25)
  })

  it("rejects non-oklch input", () => {
    expect(() => parseOklch("rgb(0,0,0)")).toThrow(/not an oklch/i)
  })
})

// ---------- conversion + math ----------

describe("oklchToSrgb", () => {
  it("converts pure black", () => {
    const rgb = oklchToSrgb(parseOklch("oklch(0 0 0)"))
    expect(rgb.r).toBeCloseTo(0, 2)
    expect(rgb.g).toBeCloseTo(0, 2)
    expect(rgb.b).toBeCloseTo(0, 2)
  })

  it("converts pure white", () => {
    const rgb = oklchToSrgb(parseOklch("oklch(1 0 0)"))
    expect(rgb.r).toBeCloseTo(1, 2)
    expect(rgb.g).toBeCloseTo(1, 2)
    expect(rgb.b).toBeCloseTo(1, 2)
  })
})

describe("WCAG luminance + contrast", () => {
  it("white luminance is 1, black is 0", () => {
    const white = { r: 1, g: 1, b: 1, a: 1 }
    const black = { r: 0, g: 0, b: 0, a: 1 }
    expect(relativeLuminance(white)).toBeCloseTo(1, 4)
    expect(relativeLuminance(black)).toBeCloseTo(0, 4)
  })

  it("contrast between black and white is 21:1", () => {
    const white = { r: 1, g: 1, b: 1, a: 1 }
    const black = { r: 0, g: 0, b: 0, a: 1 }
    expect(contrastRatio(white, black)).toBeCloseTo(21, 1)
  })

  it("is symmetric", () => {
    const a = oklchToSrgb(parseOklch("oklch(0.5 0.1 200)"))
    const b = oklchToSrgb(parseOklch("oklch(0.8 0.05 100)"))
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a))
  })

  it("identical colors have contrast 1:1", () => {
    const c = oklchToSrgb(parseOklch("oklch(0.5 0 0)"))
    expect(contrastRatio(c, c)).toBeCloseTo(1, 4)
  })
})

describe("compositeOver", () => {
  it("returns fg unchanged when alpha is 1", () => {
    const fg = { r: 0.5, g: 0.5, b: 0.5, a: 1 }
    const bg = { r: 0, g: 0, b: 0, a: 1 }
    const out = compositeOver(fg, bg)
    expect(out.r).toBeCloseTo(0.5)
  })

  it("returns bg when alpha is 0", () => {
    const fg = { r: 1, g: 1, b: 1, a: 0 }
    const bg = { r: 0.3, g: 0.4, b: 0.5, a: 1 }
    const out = compositeOver(fg, bg)
    expect(out.r).toBeCloseTo(0.3)
    expect(out.g).toBeCloseTo(0.4)
    expect(out.b).toBeCloseTo(0.5)
  })

  it("blends at alpha 0.5", () => {
    const fg = { r: 1, g: 1, b: 1, a: 0.5 }
    const bg = { r: 0, g: 0, b: 0, a: 1 }
    const out = compositeOver(fg, bg)
    expect(out.r).toBeCloseTo(0.5)
  })
})

// ---------- evaluatePairs (end-to-end against a synthetic theme) ----------

describe("evaluatePairs", () => {
  it("passes a clearly-compliant palette", () => {
    // Big-contrast black-and-white-only palette. Every fg token is true
    // black, every bg token is true white — guarantees 21:1 on every pair.
    // (Doesn't have to look like a real design — exists to prove the matrix
    // can pass.)
    const white = "oklch(1 0 0)"
    const black = "oklch(0 0 0)"
    const themes = {
      light: {
        background: white,
        foreground: black,
        card: white,
        cardForeground: black,
        popover: white,
        popoverForeground: black,
        primary: black,
        primaryForeground: white,
        secondary: black,
        secondaryForeground: white,
        muted: white,
        mutedForeground: black,
        accent: black,
        accentForeground: white,
        success: black,
        successForeground: white,
        warning: black,
        warningForeground: white,
        destructive: black,
        border: black,
        input: black,
        ring: black,
      },
      dark: {
        background: black,
        foreground: white,
        card: black,
        cardForeground: white,
        popover: black,
        popoverForeground: white,
        primary: white,
        primaryForeground: black,
        secondary: white,
        secondaryForeground: black,
        muted: black,
        mutedForeground: white,
        accent: white,
        accentForeground: black,
        success: white,
        successForeground: black,
        warning: white,
        warningForeground: black,
        destructive: white,
        border: white,
        input: white,
        ring: white,
      },
    }
    const results = evaluatePairs(themes)
    const failed = results.filter((r) => !r.pass)
    expect(failed).toEqual([])
  })

  it("flags a bad pair (white on white)", () => {
    const themes = {
      light: {
        background: "oklch(1 0 0)",
        foreground: "oklch(1 0 0)", // identical → ratio 1:1
        card: "oklch(1 0 0)",
        cardForeground: "oklch(0.145 0 0)",
        popover: "oklch(1 0 0)",
        popoverForeground: "oklch(0.145 0 0)",
        primary: "oklch(0.205 0 0)",
        primaryForeground: "oklch(0.985 0 0)",
        secondary: "oklch(0.205 0 0)",
        secondaryForeground: "oklch(0.985 0 0)",
        muted: "oklch(0.205 0 0)",
        mutedForeground: "oklch(0.985 0 0)",
        accent: "oklch(0.205 0 0)",
        accentForeground: "oklch(0.985 0 0)",
        success: "oklch(0.205 0 0)",
        successForeground: "oklch(0.985 0 0)",
        warning: "oklch(0.205 0 0)",
        warningForeground: "oklch(0.985 0 0)",
        destructive: "oklch(0.205 0 0)",
        border: "oklch(0.145 0 0)",
        input: "oklch(0.145 0 0)",
        ring: "oklch(0.145 0 0)",
      },
      dark: {
        background: "oklch(0.145 0 0)",
        foreground: "oklch(1 0 0)",
        card: "oklch(0.145 0 0)",
        cardForeground: "oklch(1 0 0)",
        popover: "oklch(0.145 0 0)",
        popoverForeground: "oklch(1 0 0)",
        primary: "oklch(1 0 0)",
        primaryForeground: "oklch(0.145 0 0)",
        secondary: "oklch(1 0 0)",
        secondaryForeground: "oklch(0.145 0 0)",
        muted: "oklch(1 0 0)",
        mutedForeground: "oklch(0.145 0 0)",
        accent: "oklch(1 0 0)",
        accentForeground: "oklch(0.145 0 0)",
        success: "oklch(1 0 0)",
        successForeground: "oklch(0.145 0 0)",
        warning: "oklch(1 0 0)",
        warningForeground: "oklch(0.145 0 0)",
        destructive: "oklch(1 0 0)",
        border: "oklch(1 0 0)",
        input: "oklch(1 0 0)",
        ring: "oklch(1 0 0)",
      },
    }
    const results = evaluatePairs(themes)
    const failed = results.filter((r) => !r.pass)
    expect(failed.length).toBeGreaterThan(0)
    expect(failed[0].pair.fg).toBe("foreground")
    expect(failed[0].pair.bg).toBe("background")
    expect(failed[0].ratio).toBeCloseTo(1, 4)
  })

  it("composites translucent borders over background before evaluating", () => {
    // Dark-mode-style border: rgba white at 10%. Should look ~near-black on
    // black background → still fails the 3:1 large bar.
    const themes = {
      light: {
        background: "oklch(0.145 0 0)",
        foreground: "oklch(1 0 0)",
        card: "oklch(0.145 0 0)",
        cardForeground: "oklch(1 0 0)",
        popover: "oklch(0.145 0 0)",
        popoverForeground: "oklch(1 0 0)",
        primary: "oklch(1 0 0)",
        primaryForeground: "oklch(0.145 0 0)",
        secondary: "oklch(1 0 0)",
        secondaryForeground: "oklch(0.145 0 0)",
        muted: "oklch(1 0 0)",
        mutedForeground: "oklch(0.145 0 0)",
        accent: "oklch(1 0 0)",
        accentForeground: "oklch(0.145 0 0)",
        success: "oklch(1 0 0)",
        successForeground: "oklch(0.145 0 0)",
        warning: "oklch(1 0 0)",
        warningForeground: "oklch(0.145 0 0)",
        destructive: "oklch(1 0 0)",
        // 10% white over near-black → very low contrast
        border: "oklch(1 0 0 / 10%)",
        input: "oklch(1 0 0)",
        ring: "oklch(1 0 0)",
      },
      dark: {
        background: "oklch(0.145 0 0)",
        foreground: "oklch(1 0 0)",
        card: "oklch(0.145 0 0)",
        cardForeground: "oklch(1 0 0)",
        popover: "oklch(0.145 0 0)",
        popoverForeground: "oklch(1 0 0)",
        primary: "oklch(1 0 0)",
        primaryForeground: "oklch(0.145 0 0)",
        secondary: "oklch(1 0 0)",
        secondaryForeground: "oklch(0.145 0 0)",
        muted: "oklch(1 0 0)",
        mutedForeground: "oklch(0.145 0 0)",
        accent: "oklch(1 0 0)",
        accentForeground: "oklch(0.145 0 0)",
        success: "oklch(1 0 0)",
        successForeground: "oklch(0.145 0 0)",
        warning: "oklch(1 0 0)",
        warningForeground: "oklch(0.145 0 0)",
        destructive: "oklch(1 0 0)",
        border: "oklch(1 0 0)",
        input: "oklch(1 0 0)",
        ring: "oklch(1 0 0)",
      },
    }
    const results = evaluatePairs(themes)
    const borderLight = results.find(
      (r) => r.theme === "light" && r.pair.fg === "border",
    )!
    expect(borderLight.pass).toBe(false)
    expect(borderLight.ratio).toBeLessThan(3)
  })
})
