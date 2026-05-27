import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// Local vitest config so `pnpm --filter @aira/auth test` works in isolation
// — mirrors packages/api's setup. Node environment (no DOM); server-only
// shim resolves to the apps/web stub so test files can import the hooks
// without tripping Next's build-time guard.

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL(
          "../../apps/web/tests/server-only-stub.ts",
          import.meta.url,
        ),
      ),
    },
  },
})
