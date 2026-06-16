// F22 QA setup — reuses F23 admin persona + fixture business/subscriptions
// (those rows are already in the DB from the F23 QA run that ran earlier
// in this session). Adds clean audit_log rows covering all 24 AuditMeta
// kinds so S2 can assert every variant renders a human sentence.

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
  name: "F22 Admin",
  email: "f22-admin@mlabs.test",
  password: "f22-admin-pass-2026",
  role: "admin" as const,
}

// Fixture IDs — stable UUIDs so cleanup is surgical.
export const FIXTURES = {
  // Second admin user to use as actor2 for typeahead test
  actor2_id: "00000000-0000-4000-8000-0000000000f1",
  actor2_email: "f22-actor2@mlabs.test",
  actor2_name: "F22 Actor Two",
  // Business created in F23 QA; may or may not exist. We ensure it.
  business_id: "00000000-0000-4000-8000-0000000000e2",
  business_name: "[F23-QA] Patel Catering",
  // Subscription from F23 QA
  sub_id: "00000000-0000-4000-8000-0000000000e3",
  // Community post fixture
  post_id: "00000000-0000-4000-8000-00000000f001",
  // Sponsorship fixture ID (for the LEFT JOIN target_business_id path)
  sponsorship_id: "00000000-0000-4000-8000-00000000f002",
  // Session fixture id
  session_id: "00000000-0000-4000-8000-00000000f003",
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
  // Wipe F22-specific audit rows so seeds are idempotent.
  psql(`DELETE FROM audit_log WHERE actor_id = '${ADMIN_PERSONA.id}'`)
  psql(`DELETE FROM "user" WHERE id = '${FIXTURES.actor2_id}'`)

  // Ensure actor2 exists for typeahead scenario.
  const acct2 = randomUUID()
  psql(
    `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
     VALUES ('${FIXTURES.actor2_id}', '${FIXTURES.actor2_name}', '${FIXTURES.actor2_email}', true, 'end_user', now(), now())`,
  )
  psql(
    `INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at)
     VALUES ('${acct2}', '${FIXTURES.actor2_email}', 'credential', '${FIXTURES.actor2_id}', now(), now())`,
  )

  // Ensure the fixture business exists (F23 QA may have cleaned it up).
  psql(`
    INSERT INTO businesses (id, name, slug, category, phone, whatsapp_number, tier, verified)
    VALUES (
      '${FIXTURES.business_id}',
      '${FIXTURES.business_name.replace(/'/g, "''")}',
      'f22-qa-patel-catering',
      'food-dining',
      '+15551234567',
      '+15551234567',
      'tier3',
      false
    )
    ON CONFLICT (id) DO NOTHING
  `)

  // Ensure the fixture subscription exists.
  psql(`
    INSERT INTO business_subscription (id, business_id, plan_id, payment_status, start_date, end_date, amount_cents)
    VALUES (
      '${FIXTURES.sub_id}',
      '${FIXTURES.business_id}',
      NULL, 'overdue',
      now() - interval '32 days',
      now() - interval '2 days',
      5000
    )
    ON CONFLICT (id) DO NOTHING
  `)

  const A = ADMIN_PERSONA.id
  const B = FIXTURES.business_id
  const S = FIXTURES.sub_id
  const U2 = FIXTURES.actor2_id
  const SESS = FIXTURES.session_id
  const POST = FIXTURES.post_id
  const now = "now()"

  // Seed one row per AuditMeta.kind (24 total).
  // Use sub-second intervals so "ORDER BY at DESC" gives a predictable
  // ordering independent of clock resolution.
  const rows = [
    // ── user.* ───────────────────────────────────────────────────────────
    {
      id: randomUUID(), actor: A, action: "user.role_changed",
      tt: "user", ti: U2,
      meta: `{"kind":"user.role_changed","from":"user","to":"admin"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.banned",
      tt: "user", ti: U2,
      meta: `{"kind":"user.banned","reason":"spam"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.unbanned",
      tt: "user", ti: U2,
      meta: `{"kind":"user.unbanned"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.password_reset_sent",
      tt: "user", ti: U2,
      meta: `{"kind":"user.password_reset_sent"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.email_changed",
      tt: "user", ti: U2,
      meta: `{"kind":"user.email_changed","from_email_hash":"abc123"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.deleted_anonymized",
      tt: "user", ti: U2,
      meta: `{"kind":"user.deleted_anonymized"}`,
    },
    {
      id: randomUUID(), actor: A, action: "session.revoked",
      tt: "session", ti: SESS,
      meta: `{"kind":"session.revoked","reason":"admin"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.avatar_changed",
      tt: "user", ti: U2,
      meta: `{"kind":"user.avatar_changed"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.avatar_removed",
      tt: "user", ti: U2,
      meta: `{"kind":"user.avatar_removed"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.name_changed",
      tt: "user", ti: U2,
      meta: `{"kind":"user.name_changed"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.admin_notified",
      tt: "user", ti: U2,
      meta: `{"kind":"user.admin_notified","title":"Your listing was approved"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.signed_in",
      tt: "user", ti: U2,
      meta: `{"kind":"user.signed_in"}`,
    },
    {
      id: randomUUID(), actor: null, action: "user.signed_in_failed",
      tt: "user", ti: U2,
      meta: `{"kind":"user.signed_in_failed","reason":"bad_password"}`,
    },
    {
      id: randomUUID(), actor: A, action: "user.signed_up",
      tt: "user", ti: U2,
      meta: `{"kind":"user.signed_up"}`,
    },
    // ── business.* ───────────────────────────────────────────────────────
    {
      id: randomUUID(), actor: A, action: "business.archived",
      tt: "business", ti: B,
      meta: `{"kind":"business.archived"}`,
    },
    {
      id: randomUUID(), actor: A, action: "business.restored",
      tt: "business", ti: B,
      meta: `{"kind":"business.restored"}`,
    },
    {
      id: randomUUID(), actor: A, action: "business.subscription_recorded",
      tt: "business_subscription", ti: S,
      meta: `{"kind":"business.subscription_recorded","payment_status":"paid","plan_id":null,"end_date":"2027-01-01T00:00:00Z"}`,
    },
    {
      id: randomUUID(), actor: A, action: "business.subscription_voided",
      tt: "business_subscription", ti: S,
      meta: `{"kind":"business.subscription_voided"}`,
    },
    {
      id: randomUUID(), actor: A, action: "business.sponsorship_assigned",
      tt: "sponsorship", ti: FIXTURES.sponsorship_id,
      meta: `{"kind":"business.sponsorship_assigned","category_id":"cat-001","tier_id":"tier-gold","end_date":"2027-06-01T00:00:00Z","amount_cents":25000}`,
    },
    {
      id: randomUUID(), actor: A, action: "business.sponsorship_cancelled",
      tt: "sponsorship", ti: FIXTURES.sponsorship_id,
      meta: `{"kind":"business.sponsorship_cancelled"}`,
    },
    {
      id: randomUUID(), actor: A, action: "business.subscription_followup",
      tt: "business_subscription", ti: S,
      meta: `{"kind":"business.subscription_followup","outcome":"called","note":"Spoke to owner, renewing next week","scheduled_next":"2026-06-22T00:00:00Z"}`,
    },
    // ── app_setting.* ────────────────────────────────────────────────────
    {
      id: randomUUID(), actor: A, action: "app_setting.updated",
      tt: "app_setting", ti: "reminder_schedule",
      meta: `{"kind":"app_setting.updated","key":"reminder_schedule","old":"7","new":"14"}`,
    },
    // ── community.* ──────────────────────────────────────────────────────
    {
      id: randomUUID(), actor: A, action: "community.post_deleted",
      tt: "community_post", ti: POST,
      meta: `{"kind":"community.post_deleted","title":"Looking for kitchen supplier","body":null,"status":"approved","author_id":"${U2}","interest_count":3}`,
    },
    {
      id: randomUUID(), actor: A, action: "community.post_edited",
      tt: "community_post", ti: POST,
      meta: `{"kind":"community.post_edited","fields":["title"],"title":{"from":"Old title","to":"Looking for kitchen supplier"}}`,
    },
  ]

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const actorSql = r.actor ? `'${r.actor}'` : "NULL"
    const ttSql = r.tt ? `'${r.tt}'` : "NULL"
    const tiSql = r.ti ? `'${r.ti.replace(/'/g, "''")}'` : "NULL"
    // Spread across the last 30 minutes so ordering is stable.
    const offsetSeconds = (rows.length - i) * 60
    psql(`
      INSERT INTO audit_log (id, actor_id, action, target_type, target_id, metadata, at)
      VALUES (
        '${r.id}',
        ${actorSql},
        '${r.action}',
        ${ttSql},
        ${tiSql},
        '${r.meta.replace(/'/g, "''")}',
        now() - interval '${offsetSeconds} seconds'
      )
    `)
  }

  console.log(`[qa-setup] Seeded ${rows.length} audit_log rows.`)
}

export default async function qaGlobalSetup() {
  // eslint-disable-next-line no-restricted-syntax
  if (!process.env.DATABASE_URL) {
    throw new Error("[qa-setup] DATABASE_URL not set")
  }
  await provisionAdmin()
  seedFixtures()
}
