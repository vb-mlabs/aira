import { defineConfig } from "vitest/config"

// Standalone vitest config for the debug repro. Independent from the
// web app's vitest config so we don't drag its setupFiles / server-only
// stubs into a pure-nav test.
export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    environment: "node",
  },
})
