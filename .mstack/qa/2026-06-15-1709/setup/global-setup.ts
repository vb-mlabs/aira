// QA setup for the admin-setup-hub + super_admin gating run.
// Provisions TWO admin personas — plain admin and super_admin — and signs
// each in, dumping a storageState per persona so specs can use whichever
// is appropriate for the scenario.

import path from "path"
import { fileURLToPath } from "url"
import nextEnv from "@next/env"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
nextEnv.loadEnvConfig(path.resolve(__dirname, "../../../../apps/web"))

import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { execSync } from "child_process"
import { hashPassword } from "better-auth/crypto"
import { randomUUID } from "crypto"

const RUN_DIR = join(__dirname, "..")
const BASE_URL = "http://localhost:5000"

interface Persona {
  slug: string
  id: string
  name: string
  email: string
  password: string
  role: "admin" | "super_admin"
}

export const ADMIN: Persona = {
  slug: "admin",
  id: "00000000-0000-4000-8000-0000000008a1",
  name: "Setup QA Plain Admin",
  email: "setup-qa-admin@mlabs.test",
  password: "setup-qa-admin-pass-2026",
  role: "admin",
}

export const SUPER_ADMIN: Persona = {
  slug: "super_admin",
  id: "00000000-0000-4000-8000-0000000008a2",
  name: "Setup QA Super Admin",
  email: "setup-qa-super-admin@mlabs.test",
  password: "setup-qa-super-admin-pass-2026",
  role: "super_admin",
}

function psql(sql: string): string {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa-setup] DATABASE_URL not set")
  // ON_ERROR_STOP=1 so SQL errors fail loudly instead of silently no-op'ing
  // (memory: qa-playwright-gotchas #5).
  return execSync(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -t -A`, {
    input: sql,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim()
}

async function provisionPersona(persona: Persona) {
  psql(`DELETE FROM "user" WHERE id = '${persona.id}'`)
  const passwordHash = await hashPassword(persona.password)
  const accountId = randomUUID()
  psql(
    `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
     VALUES ('${persona.id}', '${persona.name}', '${persona.email}', true, '${persona.role}', now(), now())`,
  )
  psql(
    `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES ('${accountId}', '${persona.email}', 'credential', '${persona.id}', '${passwordHash}', now(), now())`,
  )

  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({ email: persona.email, password: persona.password }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>")
    throw new Error(
      `[qa-setup ${persona.slug}] sign-in returned ${res.status}: ${body}`,
    )
  }
  const allCookieLines = res.headers.getSetCookie?.() ?? []
  const SESSION_COOKIE_PATTERN =
    /^(?:__Secure-|__Host-)?better-auth\.session_token$/
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
    throw new Error(
      `[qa-setup ${persona.slug}] no session cookie. Got: ${allCookieLines.join(
        " | ",
      )}`,
    )
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
  const statePath = join(RUN_DIR, ".auth", `${persona.slug}.json`)
  mkdirSync(dirname(statePath), { recursive: true })
  writeFileSync(statePath, JSON.stringify(storageState, null, 2))
}

export default async function globalSetup() {
  await provisionPersona(ADMIN)
  await provisionPersona(SUPER_ADMIN)
}
