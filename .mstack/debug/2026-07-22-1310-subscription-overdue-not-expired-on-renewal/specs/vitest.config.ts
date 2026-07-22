import { defineConfig, mergeConfig } from "vitest/config"
import { fileURLToPath } from "node:url"
import base from "../../../../apps/web/vitest.config"

export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: [
        fileURLToPath(new URL("./*.repro.test.ts", import.meta.url)),
      ],
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("../../../../apps/web/src", import.meta.url)),
      },
    },
  }),
)
