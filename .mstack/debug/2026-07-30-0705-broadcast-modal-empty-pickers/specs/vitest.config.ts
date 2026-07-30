import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["./**/*.spec.ts"],
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(
        new URL("../../../../apps/web/src", import.meta.url),
      ),
      "server-only": fileURLToPath(
        new URL("../../../../apps/web/tests/server-only-stub.ts", import.meta.url),
      ),
    },
  },
})
