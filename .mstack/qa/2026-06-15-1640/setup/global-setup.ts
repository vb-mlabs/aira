// QA setup for the membership-plan tier flow.
// Provisions one admin persona, three membership plans (one per tier),
// and three businesses with predictable subscription states so the specs
// can assert tier propagation without authoring data inline.

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
  id: "00000000-0000-4000-8000-0000000007a1",
  name: "Tier QA Admin",
  email: "tier-qa-admin@mlabs.test",
  password: "tier-qa-admin-pass-2026",
  // super_admin so the QA admin can hit /admin/cron (which now gates on
  // requireSuperAdmin() per a post-implementation change to the page).
  role: "super_admin" as const,
}

export const FIXTURES = {
  city_id: "city-atlanta",
  plan_t1: "00000000-0000-4000-8000-0000000007b1",
  plan_t2: "00000000-0000-4000-8000-0000000007b2",
  plan_t3: "00000000-0000-4000-8000-0000000007b3",
  // Business with no subscriptions — should sit at tier3.
  biz_solo: "00000000-0000-4000-8000-0000000007c1",
  // Business with one active paid tier1 sub — should be tier1.
  biz_sponsored: "00000000-0000-4000-8000-0000000007c2",
  // Business with one active paid tier2 sub + an overdue tier1 sub — should be tier2.
  biz_lvl2: "00000000-0000-4000-8000-0000000007c3",
  sub_sponsored: "00000000-0000-4000-8000-0000000007d1",
  sub_lvl2_active: "00000000-0000-4000-8000-0000000007d2",
  sub_lvl2_overdue: "00000000-0000-4000-8000-0000000007d3",
}

function psql(sql: string): string {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa-setup] DATABASE_URL not set")
  return execSync(`psql "${dbUrl}" -t -A`, {
    input: sql,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim()
}

async function provisionAdmin() {
  psql(`DELETE FROM "user" WHERE id = '${ADMIN_PERSONA.id}'`)
  const passwordHash = await hashPassword(ADMIN_PERSONA.password)
  const accountId = randomUUID()
  psql(
    `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
     VALUES ('${ADMIN_PERSONA.id}', '${ADMIN_PERSONA.name}', '${ADMIN_PERSONA.email}', true, '${ADMIN_PERSONA.role}', now(), now())`,
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
    throw new Error(`[qa-setup admin] sign-in returned ${res.status}: ${body}`)
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
  // Wipe prior fixture state so re-runs are idempotent.
  psql(`DELETE FROM business_subscription WHERE id IN ('${FIXTURES.sub_sponsored}','${FIXTURES.sub_lvl2_active}','${FIXTURES.sub_lvl2_overdue}')`)
  psql(`DELETE FROM businesses WHERE id IN ('${FIXTURES.biz_solo}','${FIXTURES.biz_sponsored}','${FIXTURES.biz_lvl2}')`)
  psql(`DELETE FROM membership_plan WHERE id IN ('${FIXTURES.plan_t1}','${FIXTURES.plan_t2}','${FIXTURES.plan_t3}')`)

  // Plans — names deliberately do NOT match the human labels so the specs
  // can verify the chip reads from TIER_LABELS, not from the plan name.
  psql(`INSERT INTO membership_plan (id, city_id, name, price_cents, duration_months, tier, active)
        VALUES ('${FIXTURES.plan_t1}', '${FIXTURES.city_id}', '[QA] Top Plan', 50000, 12, 'tier1', true)`)
  psql(`INSERT INTO membership_plan (id, city_id, name, price_cents, duration_months, tier, active)
        VALUES ('${FIXTURES.plan_t2}', '${FIXTURES.city_id}', '[QA] Mid Plan', 25000, 12, 'tier2', true)`)
  psql(`INSERT INTO membership_plan (id, city_id, name, price_cents, duration_months, tier, active)
        VALUES ('${FIXTURES.plan_t3}', '${FIXTURES.city_id}', '[QA] Basic Plan', 5000, 12, 'tier3', true)`)

  // Businesses — all in restaurants for predictable listing page navigation.
  // Created with tier3 default; recompute will be triggered via subscription
  // inserts below.
  psql(`INSERT INTO businesses (id, name, slug, category, phone, verified)
        VALUES ('${FIXTURES.biz_solo}', '[QA] Solo Eatery', 'qa-solo-eatery', 'restaurants', '+15551110000', false)`)
  psql(`INSERT INTO businesses (id, name, slug, category, phone, verified)
        VALUES ('${FIXTURES.biz_sponsored}', '[QA] Sponsored Eatery', 'qa-sponsored-eatery', 'restaurants', '+15551110001', false)`)
  psql(`INSERT INTO businesses (id, name, slug, category, phone, verified)
        VALUES ('${FIXTURES.biz_lvl2}', '[QA] Level Two Eatery', 'qa-level-two-eatery', 'restaurants', '+15551110002', false)`)

  // Subscriptions seeded raw so the start/end dates land in the active
  // window. We DON'T call recomputeBusinessTier here — the verifier spec
  // exercises the recompute path explicitly via the API or via the
  // backfill cron, so this seed state is deliberately "stale" until
  // either path runs.
  psql(`INSERT INTO business_subscription (id, business_id, plan_id, payment_status, start_date, end_date, amount_cents)
        VALUES ('${FIXTURES.sub_sponsored}', '${FIXTURES.biz_sponsored}', '${FIXTURES.plan_t1}', 'paid', now() - interval '10 days', now() + interval '300 days', 50000)`)
  psql(`INSERT INTO business_subscription (id, business_id, plan_id, payment_status, start_date, end_date, amount_cents)
        VALUES ('${FIXTURES.sub_lvl2_active}', '${FIXTURES.biz_lvl2}', '${FIXTURES.plan_t2}', 'paid', now() - interval '10 days', now() + interval '300 days', 25000)`)
  psql(`INSERT INTO business_subscription (id, business_id, plan_id, payment_status, start_date, end_date, amount_cents)
        VALUES ('${FIXTURES.sub_lvl2_overdue}', '${FIXTURES.biz_lvl2}', '${FIXTURES.plan_t1}', 'overdue', now() - interval '40 days', now() - interval '5 days', 50000)`)
}

export default async function globalSetup() {
  await provisionAdmin()
  seedFixtures()
}
