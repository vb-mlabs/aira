// Theme tokens for runtime React Native consumption (e.g. status bar tint,
// splash bg, programmatic SVG strokes). Compile-time class names come from
// `tailwind.config.js` which is generated from the same source —
// `src/config/design.ts`. Hand-maintained for now; if it drifts the design
// review will catch it. (Cross-package import would couple the two tsconfigs.)

// WCAG-AA enforced (Pass 6 + scripts/check-contrast.ts). Values follow
// src/config/design.ts OKLCH lightness/chroma — recomputed when palette shifts.
export const design = {
  colors: {
    light: {
      background: "#ffffff",
      foreground: "#252525",
      muted: "#f6f6f6",
      mutedForeground: "#737373",        // L=0.48 (was 0.556)
      border: "#a3a3a3",                 // L=0.64 (was 0.922)
      primary: "#343434",
      primaryForeground: "#fbfbfb",
      destructive: "#dc2626",
      success: "#157f3a",                // L=0.48 c=0.16 h=145 (was L=0.62)
      warning: "#d97706",
    },
    dark: {
      background: "#252525",
      foreground: "#fbfbfb",
      muted: "#444444",
      mutedForeground: "#b5b5b5",
      border: "rgba(255,255,255,0.35)",  // was 0.10
      primary: "#ececec",
      primaryForeground: "#343434",
      destructive: "#f87171",
      success: "#22c55e",
      warning: "#f59e0b",
    },
  },
} as const;
