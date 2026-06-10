// QA run global setup — creates an admin test user and signs in via the
// running dev server at localhost:5000 to get a session cookie with domain
// `localhost`. Writes storageState to assets/admin-user.json so the spec
// project uses it.

import path from "path"
import { fileURLToPath } from "url"
import nextEnv from "@next/env"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Load env from apps/web/ (two dirs up: .mstack/qa/<run>/ → workspace root)
nextEnv.loadEnvConfig(path.resolve(__dirname, "../../../apps/web"))

import { mkdirSync, writeFileSync } from "fs"
import { execSync } from "child_process"
import { hashPassword } from "better-auth/crypto"
import { randomUUID } from "crypto"

export const QA_ADMIN_USER = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "QA Admin",
  email: "qa-admin@mlabs.test",
  password: "qa-admin-password-2026",
  role: "admin",
} as const

const STORAGE_STATE_PATH = path.resolve(__dirname, "assets/admin-user.json")
const BASE_URL = "http://localhost:5000"

function psql(sql: string) {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa-setup] DATABASE_URL not set")
  execSync(`psql "${dbUrl}"`, { input: sql, stdio: ["pipe", "pipe", "pipe"] })
}

export default async function qaAdminSetup() {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa-setup] DATABASE_URL not set")

  // Clean up any lingering test admin user.
  psql(`DELETE FROM "user" WHERE id = '${QA_ADMIN_USER.id}'`)

  const passwordHash = await hashPassword(QA_ADMIN_USER.password)
  const accountId = randomUUID()

  psql(
    `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
     VALUES ('${QA_ADMIN_USER.id}', 'QA Admin', '${QA_ADMIN_USER.email}', true, 'admin', now(), now())`,
  )
  psql(
    `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES ('${accountId}', '${QA_ADMIN_USER.email}', 'credential', '${QA_ADMIN_USER.id}', '${passwordHash}', now(), now())`,
  )

  // Sign in via the live dev server to get a session cookie issued for localhost.
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({ email: QA_ADMIN_USER.email, password: QA_ADMIN_USER.password }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>")
    throw new Error(`[qa-setup] sign-in returned ${res.status}: ${body}`)
  }

  const allCookieLines = res.headers.getSetCookie?.() ?? []
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
    cookieValue = line.slice(eqIdx + 1).split(";")[0]
    hasSecure = /;\s*Secure(\s|;|$)/i.test(line)
    break
  }

  if (!cookieName || !cookieValue) {
    throw new Error(`[qa-setup] no session cookie. Got: ${allCookieLines.join(" | ")}`)
  }

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

  mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true })
  writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2))
  console.log("[qa-setup] admin session written to", STORAGE_STATE_PATH)
}
