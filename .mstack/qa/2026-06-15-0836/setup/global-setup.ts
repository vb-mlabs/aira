// F23′ QA setup — admin persona, one fixture business, three subscriptions.
//
// Wipes only the fixture rows by stable UUID prefix so other DB state is
// preserved.

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

export const ADMIN_PERSONA = {
  slug: "admin",
  id: "00000000-0000-4000-8000-0000000000e1",
  name: "F23 Admin",
  email: "f23-admin@mlabs.test",
  password: "f23-admin-pass-2026",
  role: "admin" as const,
}

export const FIXTURES = {
  business_id: "00000000-0000-4000-8000-0000000000e2",
  business_name: "[F23-QA] Patel Catering",
  sub_overdue: "00000000-0000-4000-8000-0000000000e3",
  sub_due_3d: "00000000-0000-4000-8000-0000000000e4",
  sub_due_20d: "00000000-0000-4000-8000-0000000000e5",
}

function psql(sql: string) {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa-setup] DATABASE_URL not set")
  execSync(`psql "${dbUrl}"`, { input: sql, stdio: ["pipe", "pipe", "pipe"] })
}

async function provisionAdmin() {
  psql(`DELETE FROM "user" WHERE id = '${ADMIN_PERSONA.id}'`)
  const passwordHash = await hashPassword(ADMIN_PERSONA.password)
  const accountId = randomUUID()
  psql(
    `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
     VALUES ('${ADMIN_PERSONA.id}', '${ADMIN_PERSONA.name.replace(/'/g, "''")}', '${ADMIN_PERSONA.email}', true, '${ADMIN_PERSONA.role}', now(), now())`,
  )
  psql(
    `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES ('${accountId}', '${ADMIN_PERSONA.email}', 'credential', '${ADMIN_PERSONA.id}', '${passwordHash}', now(), now())`,
  )

  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({
      email: ADMIN_PERSONA.email,
      password: ADMIN_PERSONA.password,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>")
    throw new Error(
      `[qa-setup admin] sign-in returned ${res.status}: ${body}`,
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
      `[qa-setup admin] no session cookie. Got: ${allCookieLines.join(" | ")}`,
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

  const statePath = join(RUN_DIR, ".auth", `${ADMIN_PERSONA.slug}.json`)
  mkdirSync(dirname(statePath), { recursive: true })
  writeFileSync(statePath, JSON.stringify(storageState, null, 2))
}

function seedFixtures() {
  // Clean prior fixture artefacts. Subscription cascade-delete drops followup
  // rows too; business cascade-delete drops subscriptions. Then re-seed.
  psql(`DELETE FROM businesses WHERE id = '${FIXTURES.business_id}'`)
  psql(`DELETE FROM audit_log WHERE actor_id = '${ADMIN_PERSONA.id}'`)

  psql(`
    INSERT INTO businesses (
      id, name, slug, category, phone, whatsapp_number, tier, verified
    )
    VALUES (
      '${FIXTURES.business_id}',
      '${FIXTURES.business_name.replace(/'/g, "''")}',
      'f23-qa-patel-catering',
      'food-dining',
      '+15551234567',
      '+15551234567',
      'tier3',
      false
    )
  `)

  psql(`
    INSERT INTO business_subscription (
      id, business_id, plan_id, payment_status,
      start_date, end_date, amount_cents
    ) VALUES
      ('${FIXTURES.sub_overdue}',
       '${FIXTURES.business_id}', NULL, 'overdue',
       now() - interval '32 days', now() - interval '2 days', 5000),
      ('${FIXTURES.sub_due_3d}',
       '${FIXTURES.business_id}', NULL, 'paid',
       now() - interval '27 days', now() + interval '3 days', 5000),
      ('${FIXTURES.sub_due_20d}',
       '${FIXTURES.business_id}', NULL, 'paid',
       now() - interval '10 days', now() + interval '20 days', 5000)
  `)
}

export default async function qaGlobalSetup() {
  // eslint-disable-next-line no-restricted-syntax
  if (!process.env.DATABASE_URL) {
    throw new Error("[qa-setup] DATABASE_URL not set")
  }
  await provisionAdmin()
  seedFixtures()
}
