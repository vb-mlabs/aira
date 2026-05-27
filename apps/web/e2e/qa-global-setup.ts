// QA-run global setup — creates test user via psql then acquires a session
// cookie via the auth API (fetch, not the browser form) to avoid the
// BETTER_AUTH_SECRET shell guard in the primary global-setup.ts.
// Writes storageState to .mstack/qa/2026-05-27-1328/.auth/qa-user.json.

import path from "path"
import { fileURLToPath } from "url"
import nextEnv from "@next/env"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
nextEnv.loadEnvConfig(path.resolve(__dirname, ".."))

import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { execSync } from "child_process"
import { hashPassword } from "better-auth/crypto"
import { randomUUID } from "crypto"

export const QA_TEST_USER = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "QA Tester",
  email: "qa-tester@mlabs.test",
  password: "qa-test-password-2026",
} as const

// Must match the storageState path in playwright.qa.config.ts's "authed" project.
// __dirname = apps/web/e2e/  →  ../../../ = workspace root
const STORAGE_STATE_PATH = join(
  __dirname,
  "../../../.mstack/qa/2026-05-27-1328/.auth/qa-user.json",
)
const BASE_URL = "http://localhost:5000"

function psql(sql: string) {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa-setup] DATABASE_URL not set")
  execSync(`psql "${dbUrl}"`, { input: sql, stdio: ["pipe", "pipe", "pipe"] })
}

export default async function qaGlobalSetup() {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa-setup] DATABASE_URL not set")

  // ON DELETE CASCADE wipes account + session rows automatically.
  psql(`DELETE FROM "user" WHERE id = '${QA_TEST_USER.id}'`)

  const passwordHash = await hashPassword(QA_TEST_USER.password)
  const accountId = randomUUID()

  psql(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ('${QA_TEST_USER.id}', 'QA Tester', '${QA_TEST_USER.email}', true, now(), now())`,
  )
  psql(
    `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES ('${accountId}', '${QA_TEST_USER.email}', 'credential', '${QA_TEST_USER.id}', '${passwordHash}', now(), now())`,
  )

  // Acquire a real session cookie via the running dev server's auth API.
  // This avoids needing BETTER_AUTH_SECRET in the shell because the server
  // signs the cookie with whatever secret it was started with.
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({
      email: QA_TEST_USER.email,
      password: QA_TEST_USER.password,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>")
    throw new Error(`[qa-setup] sign-in returned ${res.status}: ${body}`)
  }

  // Extract the session cookie from the response.
  // getSetCookie() is available in Node 18+ (the minimum for Next.js 16).
  const allCookieLines = res.headers.getSetCookie?.() ?? []

  // BetterAuth session cookie: `better-auth.session_token` or `__Secure-better-auth.session_token`
  const SESSION_COOKIE_PATTERN = /^(?:__Secure-|__Host-)?better-auth\.session_token$/
  let cookieName: string | undefined
  let cookieValue: string | undefined

  let hasSecure = false
  for (const line of allCookieLines) {
    const eqIdx = line.indexOf("=")
    if (eqIdx < 0) continue
    const name = line.slice(0, eqIdx).trim()
    if (!SESSION_COOKIE_PATTERN.test(name)) continue
    cookieName = name
    // Keep raw value (not decoded) — CDP SetCookie expects the unencoded value
    // that will appear in the Cookie header. BetterAuth encodes '/' and '=' in
    // the Set-Cookie header; keep those as-is so CDP can store the right value.
    cookieValue = line.slice(eqIdx + 1).split(";")[0]
    hasSecure = /;\s*Secure(\s|;|$)/i.test(line)
    break
  }

  if (!cookieName || !cookieValue) {
    throw new Error(
      `[qa-setup] no session cookie in response. Got: ${allCookieLines.join(" | ")}`,
    )
  }

  // Write Playwright storageState with the session cookie.
  // Note: __Secure- prefix requires secure:true even on HTTP in Playwright CDP.
  const storageState = {
    cookies: [
      {
        name: cookieName,
        value: cookieValue,
        domain: "localhost",
        path: "/",
        expires: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
        httpOnly: true,
        sameSite: "Lax" as const,
        secure: hasSecure,
      },
    ],
    origins: [],
  }

  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true })
  writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2))
}
