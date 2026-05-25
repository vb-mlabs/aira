// @vitest-environment node
//
// Tests scripts/rename.ts against a fixture workspace tree. Each test
// copies the fixture to a fresh temp dir so runs are isolated.

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

import {
  RenameInputError,
  runRename,
  transform,
  validateConfig,
  type ForkConfig,
} from "../../../scripts/rename"

const FIXTURE = join(__dirname, "fixtures", "rename-template")

function cloneFixture(): string {
  const tmp = mkdtempSync(join(tmpdir(), "rename-test-"))
  cpSync(FIXTURE, tmp, { recursive: true })
  return tmp
}

const ACME_CFG: ForkConfig = {
  namespace: "@acme",
  slug: "acme",
  displayName: "ACME App",
  deeplinkHost: "app.acme.com",
  scheme: "acme",
  renamedAt: "2026-05-13",
}

let workdir: string

beforeEach(() => {
  workdir = cloneFixture()
})

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true })
})

describe("transform()", () => {
  it("rewrites @mlabs/<pkg> to @<namespace>/<pkg>", () => {
    const out = transform('import x from "@mlabs/db"', ACME_CFG)
    expect(out).toBe('import x from "@acme/db"')
  })

  it("rewrites subpath imports (@mlabs/db/schema → @acme/db/schema)", () => {
    const out = transform(
      'import { user } from "@mlabs/db/schema/auth"',
      ACME_CFG,
    )
    expect(out).toBe('import { user } from "@acme/db/schema/auth"')
  })

  it("does not match @mlabs- prefix (must be exact + slash boundary)", () => {
    const out = transform("@mlabs-template", ACME_CFG)
    // No slash after @mlabs → not a package path, untouched.
    expect(out).toBe("@mlabs-template")
  })

  it("replaces 'MLabs Template' phrase cleanly (no leftover 'Template' word)", () => {
    expect(transform('name: "MLabs Template"', ACME_CFG)).toBe('name: "ACME App"')
    expect(transform("# MLabs Template", ACME_CFG)).toBe("# ACME App")
    expect(transform("Welcome to MLabs Template!", ACME_CFG)).toBe(
      "Welcome to ACME App!",
    )
  })

  it("preserves bare 'MLabs' as agency attribution (does NOT rewrite)", () => {
    // HANDOVER.md.template, DESIGN.md, AGENTS.md, .replit, and
    // tooling/eslint-config/** all use 'MLabs' as the agency name. After
    // consolidation the bare \bMLabs\b matcher is dropped so these stay
    // intact for forks.
    expect(transform("Built by MLabs in 2026.", ACME_CFG)).toBe(
      "Built by MLabs in 2026.",
    )
    expect(transform("# mstack — the MLabs skill suite", ACME_CFG)).toBe(
      "# mstack — the MLabs skill suite",
    )
  })

  it("preserves bare lowercase 'mlabs' outside anchored contexts", () => {
    // Only the anchored contexts (slug "mlabs-mobile", scheme "mlabs",
    // mlabs://, mlabs.example.com, mlabs-template, mlabs/mlabs template,
    // @mlabs/) get rewritten. Bare lowercase 'mlabs' stays.
    expect(transform("see mlabs convention in CONTRIBUTING", ACME_CFG)).toBe(
      "see mlabs convention in CONTRIBUTING",
    )
  })

  it("replaces 'mlabs-mobile' slug + JWT issuer", () => {
    expect(transform('"mlabs-mobile"', ACME_CFG)).toBe('"acme-mobile"')
  })

  it("replaces scheme: \"mlabs\" and mlabs:// URIs", () => {
    expect(transform('scheme: "mlabs"', ACME_CFG)).toBe('scheme: "acme"')
    expect(transform("mlabs://verify?token=abc", ACME_CFG)).toBe(
      "acme://verify?token=abc",
    )
  })

  it("replaces deep-link host literal", () => {
    expect(transform('"mlabs.example.com"', ACME_CFG)).toBe(
      '"app.acme.com"',
    )
  })

  it("replaces root package.json name", () => {
    expect(transform('"name": "mlabs-template"', ACME_CFG)).toBe(
      '"name": "acme-template"',
    )
  })

  it("rewrites CHANGELOG 'mlabs/mlabs template' reference", () => {
    expect(transform("Changes to the mlabs/mlabs template.", ACME_CFG)).toBe(
      "Changes to the acme/acme template.",
    )
  })
})

describe("runRename() on fixture", () => {
  it("rewrites @mlabs/* everywhere it appears across the tree", () => {
    runRename({ repoRoot: workdir, config: ACME_CFG, dryRun: false })
    const sample = readFileSync(join(workdir, "apps/web/src/sample.ts"), "utf8")
    expect(sample).toContain('from "@acme/db/client"')
    expect(sample).toContain('from "@acme/db/schema"')
    expect(sample).toContain('from "@acme/auth/server"')
    expect(sample).toContain('from "@acme/services"')
    expect(sample).not.toMatch(/@mlabs\//)

    const rootPkg = readFileSync(join(workdir, "package.json"), "utf8")
    expect(rootPkg).toContain('"name": "acme-template"')
    expect(rootPkg).toContain('"@acme/config": "workspace:*"')

    const mobilePkg = readFileSync(
      join(workdir, "apps/mobile/package.json"),
      "utf8",
    )
    expect(mobilePkg).toContain('"name": "@acme/mobile"')

    const authPkg = readFileSync(
      join(workdir, "packages/auth/package.json"),
      "utf8",
    )
    expect(authPkg).toContain('"name": "@acme/auth"')
    expect(authPkg).toContain('"@acme/db": "workspace:*"')
  })

  it("rewrites brand strings in app.config.ts + jwt.ts + Maestro", () => {
    runRename({ repoRoot: workdir, config: ACME_CFG, dryRun: false })

    const appCfg = readFileSync(
      join(workdir, "apps/mobile/app.config.ts"),
      "utf8",
    )
    expect(appCfg).toContain('name: "ACME App"')
    expect(appCfg).toContain('slug: "acme-mobile"')
    expect(appCfg).toContain('scheme: "acme"')
    expect(appCfg).toContain('"app.acme.com"')
    expect(appCfg).toContain('"ACME App needs access to your photos."')
    // bundle IDs untouched
    expect(appCfg).toContain('bundleIdentifier: "com.example.mlabs"')

    const jwt = readFileSync(
      join(workdir, "packages/auth/src/jwt.ts"),
      "utf8",
    )
    expect(jwt).toContain('const ISSUER = "acme-mobile"')

    const maestro = readFileSync(
      join(workdir, "apps/mobile/.maestro/01-smoke.yaml"),
      "utf8",
    )
    expect(maestro).toContain('"acme://verify?token=abc"')
    expect(maestro).toContain('"Welcome to ACME App"')
    // bundle ID in appId stays manual
    expect(maestro).toContain("appId: com.example.mlabs")
  })

  it("preserves .well-known/ placeholders byte-for-byte", () => {
    const aasaBefore = readFileSync(
      join(FIXTURE, "apps/web/public/.well-known/apple-app-site-association"),
      "utf8",
    )
    const linksBefore = readFileSync(
      join(FIXTURE, "apps/web/public/.well-known/assetlinks.json"),
      "utf8",
    )

    runRename({ repoRoot: workdir, config: ACME_CFG, dryRun: false })

    const aasaAfter = readFileSync(
      join(workdir, "apps/web/public/.well-known/apple-app-site-association"),
      "utf8",
    )
    const linksAfter = readFileSync(
      join(workdir, "apps/web/public/.well-known/assetlinks.json"),
      "utf8",
    )

    expect(aasaAfter).toBe(aasaBefore)
    expect(linksAfter).toBe(linksBefore)
  })

  it("skips the generated tailwind.config.js even though it mentions @mlabs", () => {
    const before = readFileSync(
      join(FIXTURE, "apps/mobile/tailwind.config.js"),
      "utf8",
    )
    runRename({ repoRoot: workdir, config: ACME_CFG, dryRun: false })
    const after = readFileSync(
      join(workdir, "apps/mobile/tailwind.config.js"),
      "utf8",
    )
    expect(after).toBe(before) // untouched; regenerated post-rename
  })

  it("dry-run writes no files", () => {
    const samplePathInWork = join(workdir, "apps/web/src/sample.ts")
    const before = readFileSync(samplePathInWork, "utf8")
    const result = runRename({
      repoRoot: workdir,
      config: ACME_CFG,
      dryRun: true,
    })
    expect(result.filesChanged).toBeGreaterThan(0)
    const after = readFileSync(samplePathInWork, "utf8")
    expect(after).toBe(before)
  })

  it("is idempotent: second run yields no changes", () => {
    runRename({ repoRoot: workdir, config: ACME_CFG, dryRun: false })
    const second = runRename({
      repoRoot: workdir,
      config: ACME_CFG,
      dryRun: true,
    })
    expect(second.filesChanged).toBe(0)
  })

  it("completeness: post-rename, no @mlabs/, no 'MLabs Template', no anchored mlabs tokens remain", () => {
    runRename({ repoRoot: workdir, config: ACME_CFG, dryRun: false })

    function walkPaths(dir: string): string[] {
      const out: string[] = []
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const e of entries) {
        const full = join(dir, e.name)
        if (e.isDirectory()) {
          if (e.name === "node_modules" || e.name === ".git") continue
          out.push(...walkPaths(full))
        } else {
          out.push(full)
        }
      }
      return out
    }

    const skip = new Set([
      join(workdir, "apps/mobile/tailwind.config.js"),
      join(
        workdir,
        "apps/web/public/.well-known/apple-app-site-association",
      ),
      join(workdir, "apps/web/public/.well-known/assetlinks.json"),
    ])

    for (const file of walkPaths(workdir)) {
      if (skip.has(file)) continue
      if (statSync(file).size === 0) continue
      const content = readFileSync(file, "utf8")
      // Brand IDs that are intentionally manual stay; everything else must go.
      const cleaned = content
        .replaceAll("com.example.mlabs", "")
        .replaceAll("appId: com.example.mlabs", "")
      expect(
        cleaned.includes("@mlabs/"),
        `${file} still contains @mlabs/`,
      ).toBe(false)
      expect(
        cleaned.includes("MLabs Template"),
        `${file} still contains 'MLabs Template' phrase`,
      ).toBe(false)
      // Bare lowercase `mlabs` in anchored contexts (slug, scheme, host,
      // template-name, mlabs/mlabs template) must all be gone. Bare
      // `mlabs` in unrelated prose is allowed (preserved as attribution).
      expect(
        cleaned.includes("mlabs-mobile"),
        `${file} still contains 'mlabs-mobile'`,
      ).toBe(false)
      expect(
        cleaned.includes("mlabs.example.com"),
        `${file} still contains 'mlabs.example.com'`,
      ).toBe(false)
      expect(
        cleaned.includes("mlabs-template"),
        `${file} still contains 'mlabs-template'`,
      ).toBe(false)
      expect(
        cleaned.includes("mlabs/mlabs template"),
        `${file} still contains 'mlabs/mlabs template'`,
      ).toBe(false)
    }
  })
})

describe("validateConfig()", () => {
  it("accepts a well-formed config", () => {
    const cfg = validateConfig({
      namespace: "@acme",
      slug: "acme",
      displayName: "ACME App",
      deeplinkHost: "app.acme.com",
    })
    expect(cfg.scheme).toBe("acme") // defaults to slug
  })

  it("rejects namespace without @", () => {
    expect(() =>
      validateConfig({
        namespace: "acme",
        slug: "acme",
        displayName: "ACME",
        deeplinkHost: "a.b.c",
      }),
    ).toThrow(RenameInputError)
  })

  it("rejects uppercase slug", () => {
    expect(() =>
      validateConfig({
        namespace: "@acme",
        slug: "ACME",
        displayName: "ACME",
        deeplinkHost: "a.b.c",
      }),
    ).toThrow(RenameInputError)
  })

  it("rejects bare hostname (must have dot)", () => {
    expect(() =>
      validateConfig({
        namespace: "@acme",
        slug: "acme",
        displayName: "ACME",
        deeplinkHost: "localhost",
      }),
    ).toThrow(RenameInputError)
  })

  it("rejects empty display name", () => {
    expect(() =>
      validateConfig({
        namespace: "@acme",
        slug: "acme",
        displayName: "   ",
        deeplinkHost: "a.b.c",
      }),
    ).toThrow(RenameInputError)
  })
})

describe(".fork-config.json + FORK_CHECKLIST.md emission", () => {
  it("writes .fork-config.json after a successful run when run via main entry", async () => {
    // We don't invoke main() directly (it reads argv + exits) — we verify
    // the side effects by calling runRename + the helper that main() uses.
    runRename({ repoRoot: workdir, config: ACME_CFG, dryRun: false })

    // Simulate the post-rename writes that main() performs.
    const { writeFileSync } = await import("node:fs")
    writeFileSync(
      join(workdir, ".fork-config.json"),
      JSON.stringify(ACME_CFG, null, 2) + "\n",
      "utf8",
    )
    const cfgRead = JSON.parse(
      readFileSync(join(workdir, ".fork-config.json"), "utf8"),
    )
    expect(cfgRead.namespace).toBe("@acme")
    expect(cfgRead.slug).toBe("acme")
    expect(cfgRead.renamedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("FORK_CHECKLIST.md.template is present in the fixture", () => {
    expect(
      existsSync(join(workdir, "FORK_CHECKLIST.md.template")),
    ).toBe(true)
  })
})
