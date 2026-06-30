// QA setup for the admin businesses renewal urgency caption + overdue
// row stripe (commits f1d30c7..75797a0 on feat/admin-businesses-renewal-urgency-pill).
//
// Provisions one plain admin persona and seeds 8 businesses with
// subscriptions covering every caption + row-treatment branch:
//
//   1. Saffron Spice         paid     +2d    critical caption, no border
//   2. Patel Brothers        paid     +8d    muted MM/DD/YYYY, no border
//   3. Krishna Yoga          paid     +25d   muted MM/DD/YYYY, no border
//   4. Tandoori Express      overdue  -3d    bold "OVERDUE 3d" + border
//   5. Mumbai Tiffin         overdue  -12d   bold "OVERDUE 12d" + border
//   6. Bharatanatyam Academy pending  +5d    muted "in 5 days", no border
//   7. Dosa Hut              none     —      no caption, no border
//   8. Stale Paid Tea House  paid     -5d    FALL-THROUGH: bold "OVERDUE 5d"
//                                            + border, badge still says "paid"
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

const ADMIN = {
  slug: "admin",
  id: "00000000-0000-4000-8000-0000000016a1",
  name: "QA Urgency Admin",
  email: "qa-urgency-admin@mlabs.test",
  password: "qa-urgency-admin-pass-2026",
  role: "admin" as const,
}

interface SeedBiz {
  /** UUIDs use the 0000-0000-4000-8000-00000000160X namespace. */
  id: string
  /** Slug must be unique across the directory (qa- prefix keeps fixtures isolated). */
  slug: string
  name: string
  /** Days from now; negative for past dates (overdue or stale-paid). */
  daysOffset: number | null
  paymentStatus: "paid" | "pending" | "overdue" | null
}

const SEEDS: SeedBiz[] = [
  { id: "00000000-0000-4000-8000-000000001601", slug: "qa-saffron-spice",         name: "Saffron Spice Restaurant", daysOffset: 2,    paymentStatus: "paid" },
  { id: "00000000-0000-4000-8000-000000001602", slug: "qa-patel-brothers",        name: "Patel Brothers Grocery",   daysOffset: 8,    paymentStatus: "paid" },
  { id: "00000000-0000-4000-8000-000000001603", slug: "qa-krishna-yoga",          name: "Krishna Yoga Studio",      daysOffset: 25,   paymentStatus: "paid" },
  { id: "00000000-0000-4000-8000-000000001604", slug: "qa-tandoori-express",      name: "Tandoori Express",         daysOffset: -3,   paymentStatus: "overdue" },
  { id: "00000000-0000-4000-8000-000000001605", slug: "qa-mumbai-tiffin",         name: "Mumbai Tiffin Service",    daysOffset: -12,  paymentStatus: "overdue" },
  { id: "00000000-0000-4000-8000-000000001606", slug: "qa-bharatanatyam-academy", name: "Bharatanatyam Academy",    daysOffset: 5,    paymentStatus: "pending" },
  { id: "00000000-0000-4000-8000-000000001607", slug: "qa-dosa-hut",              name: "Dosa Hut",                 daysOffset: null, paymentStatus: null },
  { id: "00000000-0000-4000-8000-000000001608", slug: "qa-stale-paid-tea",        name: "Stale Paid Tea House",     daysOffset: -5,   paymentStatus: "paid" },
]

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

async function provisionAdmin() {
  psql(`DELETE FROM "user" WHERE id = '${ADMIN.id}'`)
  const passwordHash = await hashPassword(ADMIN.password)
  const accountId = randomUUID()
  psql(
    `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
     VALUES ('${ADMIN.id}', '${ADMIN.name}', '${ADMIN.email}', true, '${ADMIN.role}', now(), now())`,
  )
  psql(
    `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES ('${accountId}', '${ADMIN.email}', 'credential', '${ADMIN.id}', '${passwordHash}', now(), now())`,
  )

  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>")
    throw new Error(`[qa-setup admin] sign-in returned ${res.status}: ${body}`)
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
    throw new Error(`[qa-setup admin] no session cookie. Got: ${allCookieLines.join(" | ")}`)
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
  const statePath = join(RUN_DIR, ".auth", `admin.json`)
  mkdirSync(dirname(statePath), { recursive: true })
  writeFileSync(statePath, JSON.stringify(storageState, null, 2))
}

function seedBusinesses() {
  // Clean prior fixtures so reruns are deterministic — cascade drops
  // the dependent business_subscription rows automatically.
  psql(`DELETE FROM businesses WHERE slug LIKE 'qa-%'`)

  for (const biz of SEEDS) {
    psql(
      `INSERT INTO businesses (id, name, slug, category, tier, verified, created_at, updated_at)
       VALUES ('${biz.id}', '${biz.name.replace(/'/g, "''")}', '${biz.slug}', 'restaurants', 'tier3', false, now(), now())`,
    )

    if (biz.daysOffset === null || biz.paymentStatus === null) continue

    // start_date must be <= end_date (bs_date_order_check). Backdate start
    // by 365 days from end so every subscription is a valid year-long row.
    const subId = randomUUID()
    psql(
      `INSERT INTO business_subscription (id, business_id, payment_status, start_date, end_date, amount_cents, created_at, updated_at)
       VALUES (
         '${subId}',
         '${biz.id}',
         '${biz.paymentStatus}',
         now() + INTERVAL '${biz.daysOffset} days' - INTERVAL '365 days',
         now() + INTERVAL '${biz.daysOffset} days',
         5000,
         now(),
         now()
       )`,
    )
  }
}

export default async function globalSetup() {
  await provisionAdmin()
  seedBusinesses()
}
