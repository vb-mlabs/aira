import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// Local vitest config so `pnpm --filter @mlabs/api test` works in isolation
// — the root config pulls in jsdom + React plugin which this package
// doesn't need. Root `pnpm test` still picks these tests up via the
// monorepo-wide include glob.

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Next.js's server-only marker is a build-time guard; in tests it's a
      // no-op. Mirror the root config's stub so package-isolated test runs
      // can import server-only modules.
      "server-only": fileURLToPath(
        new URL(
          "../../apps/web/tests/server-only-stub.ts",
          import.meta.url,
        ),
      ),
    },
  },
})
