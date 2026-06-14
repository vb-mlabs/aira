// F20 v2 QA setup — admin persona + a "responder" persona we need to write
// a post_interest row for one of the fixture posts (so the respondent
// expander has something to load).
//
// Fixtures cover one post per status so the chip filters can be exercised
// without ambiguity:
//   - 1 pending post (admin moderates → approve / reject)
//   - 1 approved post with two respondents (interest expander)
//   - 1 expired post (delete + edit on a non-pending row)
//   - 1 rejected post (rejected_reason header line)

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
  role: "end_user" | "admin"
}

const PERSONAS: Persona[] = [
  {
    slug: "admin",
    id: "00000000-0000-4000-8000-0000000000c1",
    name: "F20v2 Admin",
    email: "f20v2-admin@mlabs.test",
    password: "f20v2-admin-pass-2026",
    role: "admin",
  },
  {
    slug: "responder",
    id: "00000000-0000-4000-8000-0000000000c2",
    name: "Helper Person",
    email: "f20v2-responder@mlabs.test",
    password: "f20v2-responder-pass-2026",
    role: "end_user",
  },
]

const FIXTURE_AUTHOR_ID = "00000000-0000-4000-8000-0000000000c3"
const FIXTURE_AUTHOR_EMAIL = "f20v2-author@mlabs.test"

const POSTS = {
  pending: "00000000-0000-4000-8000-0000000000d1",
  approved: "00000000-0000-4000-8000-0000000000d2",
  expired: "00000000-0000-4000-8000-0000000000d3",
  rejected: "00000000-0000-4000-8000-0000000000d4",
}

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

  // Clean prior fixture artefacts so re-runs start identical. We wipe ALL
  // community_post rows because the chip-count assertions need to know
  // exactly how many of each status exist. Acceptable in a dev/QA DB; this
  // setup is opt-in via the QA harness.
  const personaIds = PERSONAS.map((p) => `'${p.id}'`).join(",")
  psql(`DELETE FROM community_post`)
  psql(`DELETE FROM audit_log WHERE actor_id IN (${personaIds})`)
  psql(`DELETE FROM "user" WHERE id IN (${personaIds}, '${FIXTURE_AUTHOR_ID}')`)

  // Provision personas + session cookies.
  for (const persona of PERSONAS) {
    await provisionPersona(persona)
  }

  // Provision the fixture author (no sign-in needed — admins act on the posts).
  psql(
    `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
     VALUES ('${FIXTURE_AUTHOR_ID}', 'Fixture Author', '${FIXTURE_AUTHOR_EMAIL}', true, 'end_user', now(), now())
     ON CONFLICT (id) DO NOTHING`,
  )

  // Seed one post per status, owned by the fixture author.
  psql(`
    INSERT INTO community_post (id, user_id, title, body, status, expires_at, rejected_reason, interest_count, approved_at, created_at)
    VALUES
      ('${POSTS.pending}',  '${FIXTURE_AUTHOR_ID}', '[F20v2-QA] pending request',  'pending body',  'pending',  NULL,                       NULL,                       0, NULL,    now() - interval '5 minutes'),
      ('${POSTS.approved}', '${FIXTURE_AUTHOR_ID}', '[F20v2-QA] approved request', 'approved body', 'approved', now() + interval '30 days', NULL,                       2, now(),   now() - interval '1 hour'),
      ('${POSTS.expired}',  '${FIXTURE_AUTHOR_ID}', '[F20v2-QA] expired request',  'expired body',  'expired',  now() - interval '1 day',   NULL,                       0, now() - interval '31 days', now() - interval '40 days'),
      ('${POSTS.rejected}', '${FIXTURE_AUTHOR_ID}', '[F20v2-QA] rejected request', 'rejected body', 'rejected', NULL,                       'Tone is too commercial.',  0, NULL,    now() - interval '2 hours')
  `)

  // Two respondents on the approved post — so the expander has data to load.
  psql(`
    INSERT INTO post_interest (id, post_id, user_id, message, created_at)
    VALUES
      ('${randomUUID()}', '${POSTS.approved}', '${PERSONAS[1].id}', 'I can recommend Dr. Mehta — takes Aetna PPO.', now() - interval '30 minutes'),
      ('${randomUUID()}', '${POSTS.approved}', '${FIXTURE_AUTHOR_ID}', NULL, now() - interval '15 minutes')
  `)
}

export { PERSONAS, POSTS, FIXTURE_AUTHOR_ID }
