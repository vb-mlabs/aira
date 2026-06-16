// F17 QA setup — single admin persona for the renewal-schedule flow.
// Adapted from the F20 multi-persona setup (only admin needed here).

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

interface Persona {
  slug: string
  id: string
  name: string
  email: string
  password: string
  role: "end_user" | "admin"
}

const RUN_DIR = join(__dirname, "..")
const BASE_URL = "http://localhost:5000"

const PERSONAS: Persona[] = [
  {
    slug: "admin",
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "F17 Admin",
    email: "f17-admin@mlabs.test",
    password: "f17-admin-pass-2026",
    role: "admin",
  },
]

function psql(sql: string) {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa-setup] DATABASE_URL not set")
  execSync(`psql "${dbUrl}"`, { input: sql, stdio: ["pipe", "pipe", "pipe"] })
}

async function provisionPersona(persona: Persona) {
  psql(`DELETE FROM "user" WHERE id = '${persona.id}'`)

  const passwordHash = await hashPassword(persona.password)
  const accountId = randomUUID()

  psql(
    `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
     VALUES ('${persona.id}', '${persona.name.replace(/'/g, "''")}', '${persona.email}', true, '${persona.role}', now(), now())`,
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
    throw new Error(
      `[qa-setup ${persona.slug}] no session cookie. Got: ${allCookieLines.join(" | ")}`,
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

export default async function qaGlobalSetup() {
  // eslint-disable-next-line no-restricted-syntax
  if (!process.env.DATABASE_URL) {
    throw new Error("[qa-setup] DATABASE_URL not set")
  }

  // Wipe prior F17 audit rows for the admin persona so re-runs don't pile up.
  // Note: column is actor_id (not user_id) but FK references user(id) so
  // wiping by actor_id is safe; the user row is recreated below.
  const ids = PERSONAS.map((p) => `'${p.id}'`).join(",")
  // Audit rows reference user via FK ON DELETE SET NULL, so deleting the
  // user wouldn't wipe these — clear them explicitly.
  psql(`DELETE FROM audit_log WHERE actor_id IN (${ids})`)

  // Reset reminder_schedule to the seeded default so each run starts fresh.
  psql(`UPDATE app_setting SET value = '7' WHERE key = 'reminder_schedule'`)

  for (const persona of PERSONAS) {
    await provisionPersona(persona)
  }
}
