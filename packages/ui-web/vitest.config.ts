import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

// Base vitest config for @aira/ui-web. Real component tests (rendering
// through @testing-library/react) currently blow up with "Invalid hook
// call" — the workspace's pnpm layout (node-linker=hoisted +
// shamefully-hoist=true, both required for Expo autolinking; see .npmrc)
// leaves the workspace with multiple physical react-dom copies and
// React 19's per-module dispatcher can't reconcile them via Vite alias
// alone. Non-rendering tests (pure functions, hooks tested via renderHook
// once the dance is sorted) can be added here in the meantime.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
    include: ["src/**/*.test.{ts,tsx}"],
  },
})
