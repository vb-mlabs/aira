// QA setup for G1 — Business Owner Reachability
// (commits 029defd..b133768 on feat/business-owner-reachability).
//
// Provisions:
//   - 1 admin persona (qa-owner-admin)
//   - 2 end_user owner candidates (qa-owner-1, qa-owner-2)
//   - 3 businesses:
//       * qa-biz-unlinked  — fresh, no owner — used for S1 (assign)
//       * qa-biz-linked    — pre-linked to qa-owner-1 — used for S2 + S4
//       * qa-biz-archived  — soft-deleted, no owner — used for S5 (assignment block)
//
// Two session cookies written:
//   .auth/admin.json   — qa-owner-admin
//   .auth/owner-1.json — qa-owner-1 (linked owner)
//
// Memory: psql ON_ERROR_STOP=1 (qa-playwright-gotchas #5).

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
  role: "end_user" | "admin" | "super_admin"
}

// super_admin because /admin/businesses/[id] fetches the city list via
// listCitiesAdminOp, which requires super_admin permission. A plain admin
// can't load the detail page at all in this app — a pre-existing constraint,
// not part of G1.
const ADMIN: Persona = {
  slug: "admin",
  id: "00000000-0000-4000-8000-0000000017a1",
  name: "QA Owner Admin",
  email: "qa-owner-admin@mlabs.test",
  password: "qa-owner-admin-pass-2026",
  role: "super_admin",
}

const OWNER_1: Persona = {
  slug: "owner-1",
  id: "00000000-0000-4000-8000-0000000017b1",
  name: "QA Owner One",
  email: "qa-owner-1@mlabs.test",
  password: "qa-owner-1-pass-2026",
  role: "end_user",
}

const OWNER_2: Persona = {
  slug: "owner-2",
  id: "00000000-0000-4000-8000-0000000017b2",
  name: "QA Owner Two",
  email: "qa-owner-2@mlabs.test",
  password: "qa-owner-2-pass-2026",
  role: "end_user",
}

interface SeedBiz {
  id: string
  slug: string
  name: string
  ownerUserId: string | null
  archived: boolean
}

const BIZ_UNLINKED: SeedBiz = {
  id: "00000000-0000-4000-8000-000000001701",
  slug: "qa-biz-unlinked",
  name: "QA Unlinked Bakery",
  ownerUserId: null,
  archived: false,
}

const BIZ_LINKED: SeedBiz = {
  id: "00000000-0000-4000-8000-000000001702",
  slug: "qa-biz-linked",
  name: "QA Linked Cafe",
  ownerUserId: OWNER_1.id,
  archived: false,
}

const BIZ_ARCHIVED: SeedBiz = {
  id: "00000000-0000-4000-8000-000000001703",
  slug: "qa-biz-archived",
  name: "QA Archived Tea Stall",
  ownerUserId: null,
  archived: true,
}

const SEEDS = [BIZ_UNLINKED, BIZ_LINKED, BIZ_ARCHIVED]
const PERSONAS = [ADMIN, OWNER_1, OWNER_2]

function psql(sql: string): string {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa-setup] DATABASE_URL not set")
  return execSync(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -t -A`, {
    input: sql,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim()
}

async function provisionPersona(persona: Persona): Promise<void> {
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

  // OWNER_2 isn't expected to log in during the run; skip the cookie acquisition
  // for it so we don't waste time on the auth API round-trip.
  if (persona.slug === "owner-2") return

  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({
      email: persona.email,
      password: persona.password,
    }),
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

function seedBusinesses(): void {
  psql(`DELETE FROM businesses WHERE slug LIKE 'qa-biz-%'`)
  for (const biz of SEEDS) {
    const ownerClause = biz.ownerUserId
      ? `, owner_user_id = '${biz.ownerUserId}'`
      : ``
    const deletedAtClause = biz.archived
      ? `, deleted_at = now() - INTERVAL '1 day'`
      : ``
    psql(
      `INSERT INTO businesses (id, name, slug, category, tier, verified, created_at, updated_at)
       VALUES ('${biz.id}', '${biz.name.replace(/'/g, "''")}', '${biz.slug}', 'restaurants', 'tier3', false, now(), now())`,
    )
    if (biz.ownerUserId || biz.archived) {
      psql(
        `UPDATE businesses
         SET id = id
           ${ownerClause}
           ${deletedAtClause}
         WHERE id = '${biz.id}'`,
      )
    }

    // Add a paid subscription so the business is "visible" per VISIBLE
    // predicate in queries (active subs covering now() unlock public reads
    // — admin reads don't need it, but the my-listings query and
    // /listings/[cat] do). Archived business gets no subscription.
    if (biz.archived) continue
    const subId = randomUUID()
    psql(
      `INSERT INTO business_subscription (id, business_id, payment_status, start_date, end_date, amount_cents, created_at, updated_at)
       VALUES (
         '${subId}',
         '${biz.id}',
         'paid',
         now() - INTERVAL '30 days',
         now() + INTERVAL '335 days',
         5000,
         now(),
         now()
       )`,
    )
  }
}

function clearNotifications(): void {
  // Wipe prior notifications + audit rows for our personas so each
  // run starts from a clean slate.
  for (const p of PERSONAS) {
    psql(`DELETE FROM notifications WHERE user_id = '${p.id}'`)
  }
  psql(
    `DELETE FROM audit_log
     WHERE actor_id = '${ADMIN.id}'
        OR (target_type = 'business' AND target_id IN (
            '${BIZ_UNLINKED.id}', '${BIZ_LINKED.id}', '${BIZ_ARCHIVED.id}'
          ))`,
  )
}

export default async function globalSetup() {
  // Personas first (so the admin cookie can be acquired BEFORE the business
  // seed runs).
  for (const persona of PERSONAS) {
    await provisionPersona(persona)
  }
  seedBusinesses()
  clearNotifications()
}

// Re-export the fixture IDs so specs can hard-code them without duplicating.
export const QA = {
  ADMIN,
  OWNER_1,
  OWNER_2,
  BIZ_UNLINKED,
  BIZ_LINKED,
  BIZ_ARCHIVED,
  BASE_URL,
}
