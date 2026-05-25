import { defineConfig } from "vitest/config"

// ESLint's RuleTester uses Mocha-style top-level describe/it calls. Vitest
// can pick these up when globals are enabled, but defaults off — the
// package-local config flips it on so the rule tests register correctly.

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
})
