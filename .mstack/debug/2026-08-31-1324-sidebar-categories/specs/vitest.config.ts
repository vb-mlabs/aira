import { defineConfig, mergeConfig } from "vitest/config"
import { fileURLToPath } from "node:url"
import base from "../../../../packages/services/vitest.config"

// Override include so the .mstack/ repro spec is picked up by the base
// config (which restricts to packages/services/src/**/*.test.ts).
export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: [
        fileURLToPath(new URL("./*.test.ts", import.meta.url)),
      ],
    },
  }),
)
