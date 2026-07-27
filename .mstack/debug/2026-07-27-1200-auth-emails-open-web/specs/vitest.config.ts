import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// The rewriter under test is imported from packages/auth/src/, which
// declares `import "server-only"` at the top. In Next.js that's a
// build-time guard; under vitest we alias it to a no-op stub (same
// trick apps/web/tests/setup uses).
export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL(
          "../../../../apps/web/tests/server-only-stub.ts",
          import.meta.url,
        ),
      ),
    },
  },
})
