// Playwright globalSetup — runs once before any test project (chromium or
// authed). Prepares a verified test user in the DB and writes a signed
// session cookie to STORAGE_STATE_PATH; the `authed` project loads that
// storageState so its tests start already logged in.
//
// Cleanup is BEFORE the run (not after) so orphans from a crashed previous
// run get wiped, and so the last-run user stays in the DB for post-mortem
// debugging. See apps/web/e2e/support/auth.ts for the cleanup convention.
//
// IMPORTANT: this file imports @/lib/db and @/lib/auth, which both pull in
// `server-only`. That package throws unless Node is launched with
// `--conditions=react-server`. Use `pnpm --filter @mlabs/web e2e` (the
// "e2e" script sets NODE_OPTIONS for you) — running `pnpm exec playwright
// test` directly will fail at this setup file.

// Load env in the standard Next.js order (.env, .env.local, …) BEFORE
// importing anything that reads process.env (the db/auth modules do at
// import time).
import path from "path"
import { fileURLToPath } from "url"
import nextEnv from "@next/env"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
nextEnv.loadEnvConfig(path.resolve(__dirname, ".."))

import { mkdirSync, writeFileSync } from "fs"
import { dirname } from "path"
import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"
import { env } from "@/config/env"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import {
  user as userTable,
  account as accountTable,
} from "@mlabs/db/schema"
import { E2E_TEST_USER, STORAGE_STATE_PATH } from "./support/auth"

// BetterAuth prefixes the cookie name with `__Secure-` when the configured
// baseUrl is HTTPS. The fixture matches either form so it works with whatever
// BETTER_AUTH_URL the test process has been launched with.
const COOKIE_NAME_PATTERN = /^(?:__Secure-|__Host-)?better-auth\.session_token$/

export default async function globalSetup() {
  if (!env.DATABASE_URL) {
    throw new Error(
      "[e2e auth fixture] DATABASE_URL must be set. Copy .env.local from .env.example or export it manually.",
    )
  }
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error(
      "[e2e auth fixture] BETTER_AUTH_SECRET must be set so BetterAuth can sign session cookies.",
    )
  }

  // Cleanup the stable test user if it lingers from a previous run.
  // BetterAuth's user table has ON DELETE CASCADE → session + account get
  // wiped automatically.
  await db.delete(userTable).where(eq(userTable.id, E2E_TEST_USER.id))

  const passwordHash = await hashPassword(E2E_TEST_USER.password)

  await db.insert(userTable).values({
    id: E2E_TEST_USER.id,
    name: E2E_TEST_USER.name,
    email: E2E_TEST_USER.email,
    emailVerified: true,
  })

  // Credential-provider account row. accountId is the email per BetterAuth
  // convention for the credential provider.
  await db.insert(accountTable).values({
    id: randomUUID(),
    accountId: E2E_TEST_USER.email,
    providerId: "credential",
    userId: E2E_TEST_USER.id,
    password: passwordHash,
  })

  // Use the auth.handler so we get a Response with a proper Set-Cookie
  // header (BetterAuth signs the cookie value; constructing it ourselves
  // would couple us to the internal signing format).
  const req = new Request("http://127.0.0.1/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: E2E_TEST_USER.email,
      password: E2E_TEST_USER.password,
    }),
  })
  const res = await auth.handler(req)
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable response body>")
    throw new Error(
      `[e2e auth fixture] sign-in/email returned ${res.status}: ${body}`,
    )
  }

  const setCookies = res.headers.getSetCookie?.() ?? []
  // Each Set-Cookie line looks like `name=value; Max-Age=...; Path=/; HttpOnly; Secure; SameSite=Lax`.
  let cookieName: string | undefined
  let rawValue: string | undefined
  let hasSecure = false
  for (const line of setCookies) {
    const eq = line.indexOf("=")
    if (eq < 0) continue
    const name = line.slice(0, eq).trim()
    if (!COOKIE_NAME_PATTERN.test(name)) continue
    cookieName = name
    rawValue = line.slice(eq + 1).split(";")[0]
    hasSecure = /;\s*Secure(\s|;|$)/i.test(line)
    break
  }
  if (!cookieName || !rawValue) {
    throw new Error(
      `[e2e auth fixture] no BetterAuth session cookie in Set-Cookie. ` +
        `Got: ${setCookies.join(" | ") || "(empty)"}. ` +
        `Expected name matching ${COOKIE_NAME_PATTERN}.`,
    )
  }
  const cookieValue = decodeURIComponent(rawValue)

  // Cookie domain + Secure flag derive from E2E_BASE_URL if set,
  // otherwise default to 127.0.0.1 over HTTP (the localhost convention).
  // Set E2E_BASE_URL=https://<your-replit-domain> to drive Playwright
  // against the live dev URL instead.
  // E2E fixture reads env directly — Playwright runs outside Next, so
  // @/config/env isn't loaded in this process.
  // eslint-disable-next-line no-restricted-syntax
  const baseUrlRaw = process.env.E2E_BASE_URL ?? "http://127.0.0.1"
  let cookieDomain = "127.0.0.1"
  let cookieSecure = hasSecure
  let cookieSameSite: "Lax" | "None" = "Lax"
  try {
    const u = new URL(baseUrlRaw)
    cookieDomain = u.hostname
    if (u.protocol === "https:") {
      cookieSecure = true
      // SameSite=None requires Secure; only set None when we're over HTTPS.
      cookieSameSite = "None"
    }
  } catch {
    // Fall through to defaults — invalid URL just means localhost.
  }

  const storageState = {
    cookies: [
      {
        name: cookieName,
        value: cookieValue,
        domain: cookieDomain,
        path: "/",
        expires: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
        httpOnly: true,
        sameSite: cookieSameSite,
        secure: cookieSecure,
      },
    ],
    origins: [],
  }

  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true })
  writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2))
}
