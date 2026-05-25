#!/usr/bin/env node
/* eslint-disable */
// Deploy-time pruner. Run after `next build` (which emits the standalone
// runtime under apps/web/.next/standalone/) and after public/ + static
// have been copied into the standalone tree.
//
// This script removes everything from the workspace that isn't on the
// runtime path, so the Replit Reserved VM image stays well under the
// 8 GiB cap. See docs/template/TEMPLATE.md §11 for full context.
//
// The runtime entrypoint is:
//   node apps/web/.next/standalone/apps/web/server.js
// Anything not under apps/web/.next/standalone/ is fair game to delete.
//
// Use `--dry-run` to print what would be removed without touching disk.

const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")
const DRY_RUN = process.argv.includes("--dry-run")

function remove(rel) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) return false
  if (DRY_RUN) {
    console.log(`[deploy-prune] would remove ${rel}`)
    return true
  }
  try {
    fs.rmSync(abs, { recursive: true, force: true })
    console.log(`[deploy-prune] removed ${rel}`)
    return true
  } catch (err) {
    // Pruning is best-effort. A failed delete means the image is slightly
    // larger than ideal, not that the deploy is broken. Hit on the BetFrnd
    // fork: .cache/dotslash/.../React Native DevTools dropped by Expo with
    // restrictive permissions that fs.rmSync can't remove. Log and continue.
    console.warn(`[deploy-prune] skip ${rel} (${err.code ?? err.message})`)
    return false
  }
}

function removeChildrenMatching(dir, suffix) {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    remove(path.join(dir, entry.name, suffix))
  }
}

console.log("[deploy-prune] starting" + (DRY_RUN ? " (dry-run)" : ""))

// 1. node_modules — the standalone tree has its own under
//    apps/web/.next/standalone/node_modules with only the traced deps.
remove("node_modules")
removeChildrenMatching("apps", "node_modules")
removeChildrenMatching("packages", "node_modules")
removeChildrenMatching("tooling", "node_modules")

// 2. Next.js dev / build caches — the 582 MB Turbopack cache lives here
//    if anyone ran `pnpm dev` locally before the deploy.
remove("apps/web/.next/cache")
remove("apps/web/.next/dev")

// 3. Turborepo caches.
remove(".turbo")
removeChildrenMatching("apps", ".turbo")
removeChildrenMatching("packages", ".turbo")

// 4. Sibling apps not part of this deploy target. Mobile deploys via
//    EAS, never via the web VM image.
remove("apps/mobile")

// 5. Tests, fixtures, e2e — never run in production.
remove("apps/web/tests")
remove("apps/web/e2e")
remove("apps/web/playwright.config.ts")
remove("apps/web/vitest.config.ts")
remove("apps/web/eslint.config.mjs")
remove("apps/web/tsconfig.tsbuildinfo")

// 6. Dev tooling, mstack artifacts, internal docs.
remove(".mstack")
remove("tooling")
remove(".lefthook")
remove(".github")
remove(".cache")
remove(".npm")
remove(".local")
remove("docs")

// 7. Repo-root crumbs that have no business in a production image.
remove("attached_assets")
remove("zipFile.zip")

// 8. Dated transcript / log files at repo root.
for (const entry of fs.readdirSync(ROOT)) {
  if (/^\d{4}-\d{2}-\d{2}.*\.(txt|log)$/.test(entry)) {
    remove(entry)
  }
}

console.log("[deploy-prune] done")
