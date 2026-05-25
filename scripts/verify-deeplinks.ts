/**
 * verify-deeplinks
 * ----------------
 * Validates that the production AASA + assetlinks.json files are reachable,
 * served as `application/json`, and structurally correct.
 *
 * Runs locally only (per Phase 5.5 Architecture #6, OV6). Not wired into CI —
 * the new-project skill instructs the operator to run it once after deploying
 * a fork with their real bundle ID / SHA-256 fingerprint.
 *
 * Usage:
 *   npm run verify:deeplinks                        # uses VERIFY_DEEPLINKS_URL or argv
 *   npm run verify:deeplinks -- https://app.foo.com
 *   VERIFY_DEEPLINKS_URL=https://app.foo.com npm run verify:deeplinks
 *
 * Exit codes:
 *   0 — both manifests valid
 *   1 — one or more failures (details printed in red)
 *
 * The script is intentionally placeholder-aware: a template repo with the
 * literal `{{APPLE_TEAM_ID}}` strings still passes structural validation,
 * but the run-against-prod path catches forks that forgot to substitute.
 */

import { readFile } from "node:fs/promises"
import path from "node:path"

// ---------- terminal colors (no deps) ----------

const RESET = "\x1b[0m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const BOLD = "\x1b[1m"

const ok = (msg: string) => `${GREEN}✓${RESET} ${msg}`
const fail = (msg: string) => `${RED}✗${RESET} ${msg}`
const warn = (msg: string) => `${YELLOW}!${RESET} ${msg}`

// ---------- shapes (loose — manifest schemas vary by vendor) ----------

interface AasaDetail {
  appID?: string
  appIDs?: string[]
  paths?: string[]
}

interface Aasa {
  applinks?: {
    details?: AasaDetail[]
  }
}

interface AssetLink {
  relation?: string[]
  target?: {
    namespace?: string
    package_name?: string
    sha256_cert_fingerprints?: string[]
  }
}

// ---------- args / config ----------

function getBaseUrl(): string | null {
  // CLI arg takes precedence; matches the documented `npm run -- <url>` form.
  const cliArg = process.argv.slice(2).find((a) => !a.startsWith("-"))
  if (cliArg) return cliArg.replace(/\/$/, "")

  const env = process.env.VERIFY_DEEPLINKS_URL
  if (env) return env.replace(/\/$/, "")
  return null
}

interface MobileConfig {
  iosBundleId: string | null
  appleTeamId: string | null
  androidPackage: string | null
}

/**
 * Best-effort read of mobile/app.config.ts. We don't want to invoke `expo`
 * runtime here — we just regex out the static fields. The fork's actual
 * EAS build picks them up via Expo's own config evaluation.
 */
async function loadMobileConfig(): Promise<MobileConfig> {
  const filePath = path.join(process.cwd(), "apps", "mobile", "app.config.ts")
  try {
    const raw = await readFile(filePath, "utf8")
    return {
      iosBundleId: matchString(raw, /bundleIdentifier\s*:\s*["']([^"']+)["']/),
      appleTeamId: matchString(raw, /appleTeamId\s*:\s*["']([^"']+)["']/),
      androidPackage: matchString(raw, /package\s*:\s*["']([^"']+)["']/),
    }
  } catch {
    return { iosBundleId: null, appleTeamId: null, androidPackage: null }
  }
}

function matchString(raw: string, re: RegExp): string | null {
  const m = raw.match(re)
  return m ? m[1] : null
}

// ---------- fetchers ----------

interface FetchResult {
  status: number
  contentType: string
  body: string
}

export async function fetchManifest(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchResult> {
  const res = await fetchImpl(url, { redirect: "follow" })
  const body = await res.text()
  return {
    status: res.status,
    contentType: res.headers.get("content-type") ?? "",
    body,
  }
}

// ---------- validators ----------

export interface Finding {
  ok: boolean
  message: string
}

export function validateAasa(
  parsed: unknown,
  expected: { iosBundleId: string | null; appleTeamId: string | null },
): Finding[] {
  const findings: Finding[] = []
  const aasa = parsed as Aasa

  const details = aasa?.applinks?.details
  if (!Array.isArray(details) || details.length === 0) {
    findings.push({ ok: false, message: "applinks.details missing or empty" })
    return findings
  }

  // Collect every advertised appID (supports both `appID` and `appIDs[]`).
  const allAppIds: string[] = []
  for (const d of details) {
    if (typeof d.appID === "string") allAppIds.push(d.appID)
    if (Array.isArray(d.appIDs)) allAppIds.push(...d.appIDs.filter((x): x is string => typeof x === "string"))
  }

  if (allAppIds.length === 0) {
    findings.push({ ok: false, message: "no appID found in applinks.details" })
  } else {
    findings.push({ ok: true, message: `appIDs declared: ${allAppIds.join(", ")}` })
  }

  // Either the placeholder OR a real match with mobile/app.config.ts.
  const placeholder = "{{APPLE_TEAM_ID}}.{{IOS_BUNDLE_ID}}"
  const hasPlaceholder = allAppIds.includes(placeholder)
  if (hasPlaceholder) {
    findings.push({
      ok: true,
      message: `placeholder appID detected (template state) — fork must substitute ${placeholder}`,
    })
  } else if (expected.iosBundleId && expected.appleTeamId) {
    const expectedId = `${expected.appleTeamId}.${expected.iosBundleId}`
    if (allAppIds.includes(expectedId)) {
      findings.push({ ok: true, message: `appID matches mobile/app.config.ts (${expectedId})` })
    } else {
      findings.push({
        ok: false,
        message: `expected appID ${expectedId} (from mobile/app.config.ts) not present in AASA`,
      })
    }
  } else {
    findings.push({
      ok: false,
      message:
        "could not resolve expected appID — mobile/app.config.ts missing iosBundleId/appleTeamId and AASA has no placeholder",
    })
  }

  // Path coverage — we ship /verify* and /reset-password*.
  const pathsCovered = details.flatMap((d) => d.paths ?? [])
  const requiredPaths = ["/verify*", "/reset-password*"]
  for (const p of requiredPaths) {
    if (pathsCovered.includes(p)) {
      findings.push({ ok: true, message: `path declared: ${p}` })
    } else {
      findings.push({ ok: false, message: `required path missing: ${p}` })
    }
  }

  return findings
}

export function validateAssetlinks(
  parsed: unknown,
  expected: { androidPackage: string | null },
): Finding[] {
  const findings: Finding[] = []

  if (!Array.isArray(parsed) || parsed.length === 0) {
    findings.push({ ok: false, message: "assetlinks.json must be a non-empty array" })
    return findings
  }

  const entries = parsed as AssetLink[]
  const handleAllUrls = "delegate_permission/common.handle_all_urls"

  let foundValidEntry = false
  for (const entry of entries) {
    if (!Array.isArray(entry.relation) || !entry.relation.includes(handleAllUrls)) {
      findings.push({
        ok: false,
        message: `entry missing required relation "${handleAllUrls}"`,
      })
      continue
    }
    if (entry.target?.namespace !== "android_app") {
      findings.push({ ok: false, message: "target.namespace must be 'android_app'" })
      continue
    }
    const pkg = entry.target.package_name
    if (!pkg) {
      findings.push({ ok: false, message: "target.package_name missing" })
      continue
    }
    const fingerprints = entry.target.sha256_cert_fingerprints
    if (!Array.isArray(fingerprints) || fingerprints.length === 0) {
      findings.push({
        ok: false,
        message: "target.sha256_cert_fingerprints missing or empty",
      })
      continue
    }

    foundValidEntry = true

    const placeholderPkg = pkg === "{{ANDROID_PACKAGE}}"
    if (placeholderPkg) {
      findings.push({
        ok: true,
        message: `placeholder package_name detected (template state) — fork must substitute {{ANDROID_PACKAGE}}`,
      })
    } else if (expected.androidPackage) {
      if (pkg === expected.androidPackage) {
        findings.push({
          ok: true,
          message: `package_name matches mobile/app.config.ts (${pkg})`,
        })
      } else {
        findings.push({
          ok: false,
          message: `package_name ${pkg} does not match mobile/app.config.ts (${expected.androidPackage})`,
        })
      }
    } else {
      findings.push({
        ok: true,
        message: `package_name declared: ${pkg} (no mobile/app.config.ts to cross-check)`,
      })
    }

    // Each fingerprint must look like 32 hex bytes separated by colons; we
    // accept the placeholder explicitly.
    const fingerprintShape = /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/
    for (const fp of fingerprints) {
      if (fp === "{{ANDROID_CERT_SHA256}}") {
        findings.push({
          ok: true,
          message: "placeholder SHA-256 fingerprint (template state) — fork must substitute",
        })
      } else if (fingerprintShape.test(fp)) {
        findings.push({ ok: true, message: `SHA-256 fingerprint declared (${fp.slice(0, 20)}…)` })
      } else {
        findings.push({
          ok: false,
          message: `malformed SHA-256 fingerprint: ${fp.slice(0, 32)}`,
        })
      }
    }
  }

  if (!foundValidEntry) {
    findings.push({ ok: false, message: "no structurally-valid assetlinks entry found" })
  }

  return findings
}

// ---------- runner ----------

function printSection(title: string, findings: Finding[]) {
  console.log(`\n${BOLD}${title}${RESET}`)
  for (const f of findings) {
    console.log(`  ${f.ok ? ok(f.message) : fail(f.message)}`)
  }
}

async function checkOne(
  url: string,
  validator: (json: unknown) => Finding[],
  label: string,
): Promise<{ findings: Finding[]; allPass: boolean }> {
  const findings: Finding[] = []
  let res: FetchResult
  try {
    res = await fetchManifest(url)
  } catch (err) {
    findings.push({ ok: false, message: `fetch failed: ${(err as Error).message}` })
    return { findings, allPass: false }
  }

  if (res.status !== 200) {
    findings.push({ ok: false, message: `expected HTTP 200, got ${res.status}` })
  } else {
    findings.push({ ok: true, message: `HTTP 200 from ${url}` })
  }

  if (!res.contentType.toLowerCase().includes("application/json")) {
    findings.push({
      ok: false,
      message: `content-type must include application/json (got "${res.contentType}")`,
    })
  } else {
    findings.push({ ok: true, message: `content-type: ${res.contentType}` })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(res.body)
    findings.push({ ok: true, message: "JSON parses cleanly" })
  } catch (err) {
    findings.push({ ok: false, message: `JSON parse failed: ${(err as Error).message}` })
    return { findings, allPass: false }
  }

  findings.push(...validator(parsed))
  void label
  return { findings, allPass: findings.every((f) => f.ok) }
}

export async function main(argv: string[] = process.argv): Promise<number> {
  void argv
  const base = getBaseUrl()
  if (!base) {
    console.error(fail("no URL provided. Pass as argv or set VERIFY_DEEPLINKS_URL."))
    console.error("  Example: npm run verify:deeplinks -- https://app.example.com")
    return 1
  }

  console.log(`${BOLD}verify-deeplinks${RESET} — checking ${base}`)
  const mobile = await loadMobileConfig()
  if (!mobile.iosBundleId || !mobile.androidPackage) {
    console.log(
      warn(
        `mobile/app.config.ts not fully readable (iosBundleId=${mobile.iosBundleId}, androidPackage=${mobile.androidPackage}). Falling back to placeholder validation.`,
      ),
    )
  }

  const aasaUrl = `${base}/.well-known/apple-app-site-association`
  const assetlinksUrl = `${base}/.well-known/assetlinks.json`

  const aasaResult = await checkOne(
    aasaUrl,
    (json) =>
      validateAasa(json, {
        iosBundleId: mobile.iosBundleId,
        appleTeamId: mobile.appleTeamId,
      }),
    "AASA",
  )
  printSection("apple-app-site-association", aasaResult.findings)

  const linksResult = await checkOne(
    assetlinksUrl,
    (json) => validateAssetlinks(json, { androidPackage: mobile.androidPackage }),
    "assetlinks",
  )
  printSection("assetlinks.json", linksResult.findings)

  const allPass = aasaResult.allPass && linksResult.allPass
  console.log()
  if (allPass) {
    console.log(`${GREEN}${BOLD}✓ deep-link manifests valid${RESET}`)
    return 0
  }
  console.log(`${RED}${BOLD}✗ deep-link manifest validation failed${RESET}`)
  return 1
}

// CLI entry — only runs when invoked directly, not when imported by tests.
// import.meta.url comparison handles the tsx execution path.
const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === `file://${path.resolve(process.argv[1])}`

if (isDirectRun) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(fail(`unexpected error: ${(err as Error).stack ?? err}`))
      process.exit(1)
    },
  )
}
