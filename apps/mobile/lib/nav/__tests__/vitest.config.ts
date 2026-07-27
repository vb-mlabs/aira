import { defineConfig } from "vitest/config";

// Standalone vitest config for the nav helpers. Mobile has no test
// runner wired at the workspace level (see apps/mobile/package.json:
// the `test` script is a stub), so these tests currently run manually
// via `node_modules/.bin/vitest run apps/mobile/lib/nav/__tests__/`.
// When a real mobile test setup lands, this file becomes vestigial
// and can be removed.
export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    environment: "node",
  },
});
