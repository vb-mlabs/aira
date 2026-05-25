#!/usr/bin/env tsx
/**
 * rename.ts
 *
 * One-shot rebrand for a fork. The template uses a SINGLE brand placeholder
 * identifier — "mlabs" (lowercase) for code-level tokens and "MLabs Template"
 * for the user-visible product name. Rewrites:
 *   - @mlabs/* workspace package names + every import / dep / path-alias
 *   - "MLabs Template" phrase → displayName (handles README heading,
 *     app.config.ts name, DESIGN.md attribution)
 *   - "mlabs-mobile" slug + JWT issuer
 *   - scheme: "mlabs" + mlabs:// deep-link URIs
 *   - mlabs.example.com deep-link host
 *   - "mlabs-template" root pkg name
 *
 * Does NOT rewrite:
 *   - Bundle IDs (com.example.mlabs) — manual per FORK_CHECKLIST.md
 *   - .well-known/ placeholders — fork fills via manual substitution
 *   - pnpm lockfile — regenerated post-rename
 *   - Bare "MLabs" or bare lowercase "mlabs" outside the anchored contexts
 *     above — preserved as agency attribution in HANDOVER.md.template,
 *     DESIGN.md, AGENTS.md, tooling/eslint-config/**, .replit
 *
 * Usage:
 *   pnpm rename \
 *     --namespace @acme \
 *     --slug acme \
 *     --display-name "ACME App" \
 *     --deeplink-host app.acme.com \
 *     [--scheme acme]      # defaults to --slug
 *     [--dry-run]          # plan only, no writes
 *     [--from .fork-config.json]   # re-run from saved config
 *
 * Idempotency: writes .fork-config.json on success. Subsequent invocations
 * without --from refuse; with --from, re-apply the same rename.
 *
 * Exit codes:
 *   0 — rename applied (or no-op in --dry-run)
 *   1 — bad input, fork already configured (without --from), or write failure
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

// ---------- terminal colors (no deps, matches scripts/verify-deeplinks) ----------

const RESET = "\x1b[0m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const BOLD = "\x1b[1m"

const tag = `${BOLD}[rename]${RESET}`
const ok = (msg: string) => console.log(`${tag} ${GREEN}✓${RESET} ${msg}`)
const info = (msg: string) => console.log(`${tag} ${msg}`)
const warn = (msg: string) => console.log(`${tag} ${YELLOW}!${RESET} ${msg}`)
const die = (msg: string): never => {
  console.error(`${tag} ${RED}✗${RESET} ${msg}`)
  process.exit(1)
}

// ---------- input ----------

export interface ForkConfig {
  /** npm scope including the @. Example: "@acme". */
  namespace: string
  /** lowercase slug, no whitespace. Example: "acme". */
  slug: string
  /** Display name shown to end users. Example: "ACME App". */
  displayName: string
  /** Deep-link host. Example: "app.acme.com". */
  deeplinkHost: string
  /** URL scheme; defaults to slug when omitted. Example: "acme". */
  scheme: string
  /** ISO date — set at first successful rename. */
  renamedAt: string
}

interface CliArgs {
  namespace?: string
  slug?: string
  displayName?: string
  deeplinkHost?: string
  scheme?: string
  dryRun: boolean
  from?: string
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => {
      const v = argv[++i]
      if (v === undefined) die(`${arg} requires a value`)
      return v
    }
    switch (arg) {
      case "--namespace":
        out.namespace = next()
        break
      case "--slug":
        out.slug = next()
        break
      case "--display-name":
        out.displayName = next()
        break
      case "--deeplink-host":
        out.deeplinkHost = next()
        break
      case "--scheme":
        out.scheme = next()
        break
      case "--dry-run":
        out.dryRun = true
        break
      case "--from":
        out.from = next()
        break
      case "-h":
      case "--help":
        console.log(
          "Usage: pnpm rename --namespace @acme --slug acme --display-name 'ACME App' --deeplink-host app.acme.com [--scheme acme] [--dry-run] [--from .fork-config.json]",
        )
        process.exit(0)
      default:
        die(`Unknown argument: ${arg}`)
    }
  }
  return out
}

const NAMESPACE_RE = /^@[a-z0-9][a-z0-9-]*$/
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

export class RenameInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RenameInputError"
  }
}

export function validateConfig(c: Partial<ForkConfig>): ForkConfig {
  if (!c.namespace || !NAMESPACE_RE.test(c.namespace)) {
    throw new RenameInputError(
      `--namespace must look like "@acme" (npm scope, lowercase, starts with @). Got: ${JSON.stringify(c.namespace)}`,
    )
  }
  if (!c.slug || !SLUG_RE.test(c.slug)) {
    throw new RenameInputError(
      `--slug must be lowercase alphanumeric with hyphens (Expo slug). Got: ${JSON.stringify(c.slug)}`,
    )
  }
  if (!c.displayName || c.displayName.trim() === "") {
    throw new RenameInputError(
      `--display-name must be a non-empty string. Got: ${JSON.stringify(c.displayName)}`,
    )
  }
  if (!c.deeplinkHost || !HOST_RE.test(c.deeplinkHost)) {
    throw new RenameInputError(
      `--deeplink-host must be a valid dotted hostname (e.g. "app.acme.com"). Got: ${JSON.stringify(c.deeplinkHost)}`,
    )
  }
  const scheme = c.scheme ?? c.slug
  if (!SLUG_RE.test(scheme)) {
    throw new RenameInputError(
      `--scheme must be lowercase alphanumeric with hyphens. Got: ${JSON.stringify(scheme)}`,
    )
  }
  return {
    namespace: c.namespace,
    slug: c.slug,
    displayName: c.displayName.trim(),
    deeplinkHost: c.deeplinkHost,
    scheme,
    renamedAt: c.renamedAt ?? new Date().toISOString().slice(0, 10),
  }
}

// ---------- file walking ----------

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  ".expo",
  ".git",
  "dist",
  "build",
  "ios",
  "android",
  ".maestro-screenshots",
])

const SKIP_FILES = new Set([
  "pnpm-lock.yaml",
  ".fork-config.json",
])

// Extensionless / non-standard config files we DO want to rewrite. Without
// this list, shouldRewrite() returns false on `path.extname() === ""` and
// drops the file silently. Hit on the BetFrnd fork (2026-05-13): the rename
// missed `.replit`'s `pnpm --filter @mlabs/web` workflow args, the dev
// server bound port 5000 with no server, and the Replit preview 500'd.
// See docs/template/TEMPLATE.md recommendation #13.
const KNOWN_FILES = new Set([
  ".replit",        // Replit deployment / workflow / entrypoint refs
  ".gitignore",     // sometimes references project paths
  ".tool-versions", // asdf / mise
  "Dockerfile",     // if a fork ever adds one
])

const SKIP_PATH_SUFFIXES = [
  // Generated mobile config — regenerated via pnpm gen:mobile-tw post-rename.
  path.join("apps", "mobile", "tailwind.config.js"),
  // .well-known files use {{PLACEHOLDER}} substitution; forks fill manually.
  path.join("apps", "web", "public", ".well-known", "apple-app-site-association"),
  path.join("apps", "web", "public", ".well-known", "assetlinks.json"),
  // The rename script itself — its docstring + info() messages reference
  // literal "@mlabs", "mlabs", "MLabs Template" as the canonical source
  // patterns. Letting the script rewrite itself produces self-contradictory
  // output and obscures future maintenance of the script.
  path.join("scripts", "rename.ts"),
  // The rename script's test file — test cases contain literal @mlabs/...
  // and "MLabs Template" / "mlabs-mobile" strings as transform() inputs.
  // Rewriting them makes the assertions tautologies (input == output) and
  // breaks the dry-run test.
  path.join("apps", "web", "tests", "rename.test.ts"),
]

const SKIP_PATH_PREFIXES = [
  // The rename script's test fixture — frozen reference of the canonical
  // pre-rename state. The rename test copies this fixture to a temp dir
  // and runs the script against it. If we rewrite the fixture in-place
  // during a fork, the test loses its reference state.
  path.join("apps", "web", "tests", "fixtures") + path.sep,
  // mstack planning history — .mstack/ stores plans, reviews, code logs,
  // qa reports, and learnings. These are time-frozen artifacts that
  // document the template's evolution. Rewriting them rewrites history.
  ".mstack" + path.sep,
]

// File extensions whose contents we rewrite. Other files are left untouched.
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".jsonl",
  ".md",
  ".mdx",
  ".yaml",
  ".yml",
  ".css",
])

function* walk(root: string): Generator<string> {
  const entries = readdirSync(root, { withFileTypes: true })
  for (const e of entries) {
    if (e.name.startsWith(".") && SKIP_DIRS.has(e.name)) continue
    if (SKIP_DIRS.has(e.name)) continue
    const full = path.join(root, e.name)
    if (e.isDirectory()) {
      yield* walk(full)
    } else if (e.isFile()) {
      yield full
    }
  }
}

function shouldRewrite(absPath: string, repoRoot: string): boolean {
  const rel = path.relative(repoRoot, absPath)
  const base = path.basename(absPath)
  if (SKIP_FILES.has(base)) return false
  if (SKIP_PATH_SUFFIXES.some((suffix) => rel === suffix)) return false
  if (SKIP_PATH_PREFIXES.some((prefix) => rel.startsWith(prefix))) return false
  // Allow named extensionless config files BEFORE the ext === "" guard.
  if (KNOWN_FILES.has(base)) return true
  const ext = path.extname(absPath)
  // The .well-known/ files have no extension; they're already in
  // SKIP_PATH_SUFFIXES so we won't reach here for them.
  if (ext === "") return false
  return TEXT_EXTENSIONS.has(ext)
}

// ---------- transformations ----------

const namespaceRe = /@mlabs\/([a-z][a-z0-9-]*)((?:\/[a-zA-Z0-9_./-]+)?)/g

interface FileEdit {
  path: string
  before: string
  after: string
}

export function transform(content: string, cfg: ForkConfig): string {
  let out = content

  // Group B — brand strings. Run before Group A namespace handling.
  // Order within the group matters: the "MLabs Template" PHRASE matcher
  // runs first so the displayName replaces the entire phrase cleanly
  // (no lingering "Template" word). All other matchers are anchored to
  // unique contexts so bare "mlabs" / "MLabs" elsewhere is preserved
  // as agency attribution (HANDOVER.md.template, DESIGN.md, AGENTS.md,
  // tooling/eslint-config/**, .replit).

  // app.config.ts `name: "MLabs Template"`, DESIGN.md attribution, README
  // headings. Phrase match so we cleanly swap to displayName alone.
  out = out.replaceAll("MLabs Template", cfg.displayName)

  // packages/auth/src/jwt.ts JWT issuer + apps/mobile/app.config.ts slug.
  // Bare-token match (no quote anchoring) so we catch both `"mlabs-mobile"`
  // (TypeScript source) and `` `mlabs-mobile` `` (CHANGELOG.md backtick
  // form). The literal `mlabs-mobile` is unique enough across the
  // codebase that there's no realistic collision risk.
  out = out.replaceAll("mlabs-mobile", `${cfg.slug}-mobile`)

  // app.config.ts scheme + Maestro deep-link URIs.
  // For scheme:, only match `scheme: "mlabs"` exactly.
  out = out.replaceAll('scheme: "mlabs"', `scheme: "${cfg.scheme}"`)
  // Maestro YAML: mlabs://something
  out = out.replaceAll("mlabs://", `${cfg.scheme}://`)

  // Deep-link host. Appears in two shapes in app.config.ts:
  //   host: "mlabs.example.com"                  → just the bare host
  //   associatedDomains: ["applinks:mlabs.example.com"]   → with applinks: prefix
  // Replace the bare hostname (unquoted) so both forms get handled in one pass.
  // mlabs.example.com is unique enough not to collide with unrelated prose.
  out = out.replaceAll("mlabs.example.com", cfg.deeplinkHost)

  // Root package.json: "name": "mlabs-template"
  out = out.replaceAll('"name": "mlabs-template"', `"name": "${cfg.slug}-template"`)

  // CHANGELOG.md historical mention: "mlabs/mlabs template". Use the
  // namespace without the leading @.
  const nsBare = cfg.namespace.replace(/^@/, "")
  out = out.replaceAll("mlabs/mlabs template", `${nsBare}/${cfg.slug} template`)

  // Group A — @mlabs/<pkg>(/<subpath>) → @<namespace>/<pkg>(/<subpath>)
  // Anchored regex: requires the slash after @mlabs, so @mlabs-foo etc.
  // are not affected.
  // Wildcard form (`@mlabs/*`) appears in comments + docs as shorthand for
  // "every workspace package"; handle it before the regex since `*` is not
  // a valid package-name character.
  out = out.replaceAll("@mlabs/*", `${cfg.namespace}/*`)
  out = out.replace(namespaceRe, (_match, pkg, subpath) => {
    return `${cfg.namespace}/${pkg}${subpath ?? ""}`
  })

  // NOTE: bare `MLabs` (capital M, word-bounded) and bare lowercase `mlabs`
  // outside the anchored contexts above are INTENTIONALLY NOT REWRITTEN.
  // They preserve agency attribution in HANDOVER.md.template, DESIGN.md,
  // AGENTS.md, tooling/eslint-config/**, .replit — places where "MLabs"
  // refers to the agency that delivered the template, not the template's
  // product name. The "MLabs Template" phrase matcher above covers the
  // template-self-naming cases.

  return out
}

// ---------- FORK_CHECKLIST template emission ----------

const FORK_CHECKLIST_TEMPLATE_NAME = "FORK_CHECKLIST.md.template"

function renderForkChecklist(cfg: ForkConfig, repoRoot: string): string {
  const templatePath = path.join(repoRoot, FORK_CHECKLIST_TEMPLATE_NAME)
  if (!existsSync(templatePath)) {
    die(`Missing ${FORK_CHECKLIST_TEMPLATE_NAME} at repo root.`)
  }
  const template = readFileSync(templatePath, "utf8")
  return template
    .replaceAll("{{DISPLAY_NAME}}", cfg.displayName)
    .replaceAll("{{RENAMED_AT}}", cfg.renamedAt)
    .replaceAll("{{NAMESPACE}}", cfg.namespace)
    .replaceAll("{{SLUG}}", cfg.slug)
    .replaceAll("{{DEEPLINK_HOST}}", cfg.deeplinkHost)
}

// ---------- entry point ----------

export function runRename(opts: {
  repoRoot: string
  config: ForkConfig
  dryRun: boolean
}): { filesChanged: number; edits: FileEdit[] } {
  const edits: FileEdit[] = []
  for (const file of walk(opts.repoRoot)) {
    if (!shouldRewrite(file, opts.repoRoot)) continue
    let before: string
    try {
      before = readFileSync(file, "utf8")
    } catch {
      continue // binary or unreadable; skip
    }
    const after = transform(before, opts.config)
    if (after !== before) {
      edits.push({ path: file, before, after })
    }
  }
  if (!opts.dryRun) {
    for (const e of edits) {
      writeFileSync(e.path, e.after, "utf8")
    }
  }
  return { filesChanged: edits.length, edits }
}

function main() {
  const __filename = fileURLToPath(import.meta.url)
  const repoRoot = path.resolve(path.dirname(__filename), "..")
  const args = parseArgs(process.argv.slice(2))

  // Load existing config if --from was passed.
  let cfg: ForkConfig
  if (args.from) {
    const fromPath = path.isAbsolute(args.from) ? args.from : path.join(repoRoot, args.from)
    if (!existsSync(fromPath)) die(`--from file not found: ${fromPath}`)
    const parsed = JSON.parse(readFileSync(fromPath, "utf8"))
    cfg = validateConfig({
      ...parsed,
      ...stripUndefined({
        namespace: args.namespace,
        slug: args.slug,
        displayName: args.displayName,
        deeplinkHost: args.deeplinkHost,
        scheme: args.scheme,
      }),
    })
    info(`Re-running from ${path.relative(repoRoot, fromPath)}`)
  } else {
    const existing = path.join(repoRoot, ".fork-config.json")
    if (existsSync(existing)) {
      die(
        `Fork already renamed (.fork-config.json exists). Pass --from .fork-config.json to re-apply, or delete the file to start fresh.`,
      )
    }
    cfg = validateConfig({
      namespace: args.namespace,
      slug: args.slug,
      displayName: args.displayName,
      deeplinkHost: args.deeplinkHost,
      scheme: args.scheme,
    })
  }

  info(`Target: @mlabs → ${cfg.namespace} | MLabs Template → "${cfg.displayName}" | mlabs → ${cfg.slug}`)
  if (args.dryRun) warn("Dry run — no files will be written")

  const { filesChanged, edits } = runRename({
    repoRoot,
    config: cfg,
    dryRun: args.dryRun,
  })

  if (args.dryRun) {
    info(`Would change ${filesChanged} file(s):`)
    for (const e of edits.slice(0, 20)) {
      console.log(`  - ${path.relative(repoRoot, e.path)}`)
    }
    if (edits.length > 20) console.log(`  ... and ${edits.length - 20} more`)
    return
  }

  ok(`Renamed across ${filesChanged} file(s)`)

  // Persist .fork-config.json.
  const cfgPath = path.join(repoRoot, ".fork-config.json")
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8")
  ok(`Wrote ${path.relative(repoRoot, cfgPath)}`)

  // Make sure .fork-config.json is gitignored (it contains client display
  // name; safe to commit but also safe to keep out of git).
  ensureGitignored(repoRoot, ".fork-config.json")

  // Emit FORK_CHECKLIST.md from the template (overwrite — re-runs refresh it).
  const checklistPath = path.join(repoRoot, "FORK_CHECKLIST.md")
  writeFileSync(checklistPath, renderForkChecklist(cfg, repoRoot), "utf8")
  ok(`Wrote ${path.relative(repoRoot, checklistPath)}`)

  console.log()
  console.log(`${BOLD}NEXT STEPS${RESET}`)
  console.log(`  1. rm pnpm-lock.yaml && pnpm install`)
  console.log(`  2. pnpm gen:mobile-tw   (regenerate mobile tailwind config)`)
  console.log(`  3. Manual: edit apps/mobile/app.config.ts → ios.bundleIdentifier, android.package`)
  console.log(`     Manual: edit apps/web/public/.well-known/*  with Apple Team ID + SHA-256`)
  console.log(`  4. Open FORK_CHECKLIST.md and walk the remaining items`)
  console.log()
  console.log(`${BOLD}VERIFY${RESET}`)
  console.log(`  pnpm typecheck && pnpm lint && pnpm test`)
  console.log(`  pnpm syncpack lint && pnpm dedupe --check`)
}

function stripUndefined<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

function ensureGitignored(repoRoot: string, line: string) {
  const giPath = path.join(repoRoot, ".gitignore")
  let content = ""
  try {
    content = readFileSync(giPath, "utf8")
  } catch {
    // No .gitignore — leave alone, not our problem to create.
    return
  }
  const lines = content.split("\n").map((l) => l.trim())
  if (lines.includes(line)) return
  const next = (content.endsWith("\n") ? content : content + "\n") + `${line}\n`
  writeFileSync(giPath, next, "utf8")
}

// Run as CLI when invoked directly (not when imported by tests).
const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  try {
    main()
  } catch (err) {
    die(err instanceof Error ? err.message : String(err))
  }
}
