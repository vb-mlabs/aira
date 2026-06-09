#!/usr/bin/env node
// Standalone script — run before playwright to create e2e user + storageState.
// Does NOT go through Next.js env chain. Uses DATABASE_URL from process.env directly.
//
// Usage: node .mstack/qa/2026-06-08-1600/prepare-auth.mjs

import path from "path"
import { fileURLToPath } from "url"
import { mkdirSync, writeFileSync } from "fs"
import { dirname } from "path"
import { randomUUID } from "crypto"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const USER_ID = "00000000-0000-4000-8000-000000000001"
const USER_EMAIL = "e2e-test-primary@mlabs.test"
const USER_PASSWORD = "e2e-test-password"
const USER_NAME = "E2E Primary"

const BASE_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:5000"

const STORAGE_STATE_PATH = path.resolve(
  __dirname,
  "../../../apps/web/e2e/.auth/user.json",
)

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("[prepare-auth] DATABASE_URL not set")

  // Dynamic import so this script can be run as pure ESM.
  const { Pool, neonConfig } = await import("@neondatabase/serverless")
  const ws = await import("ws")
  neonConfig.webSocketConstructor = ws.default ?? ws
  const { hashPassword } = await import("better-auth/crypto")

  const pool = new Pool({ connectionString: databaseUrl })
  try {
    console.log("[prepare-auth] creating e2e test user…")
    // Delete stale user (CASCADE drops session + account rows).
    await pool.query(`DELETE FROM "user" WHERE id = $1`, [USER_ID])

    await pool.query(
      `INSERT INTO "user"
         (id, name, email, email_verified, role, created_at, updated_at,
          notifications_updated_at, messages_updated_at)
       VALUES ($1,$2,$3,true,'end_user',NOW(),NOW(),NOW(),NOW())`,
      [USER_ID, USER_NAME, USER_EMAIL],
    )

    const passwordHash = await hashPassword(USER_PASSWORD)
    await pool.query(
      `INSERT INTO account
         (id, account_id, provider_id, user_id, password, created_at, updated_at)
       VALUES ($1,$2,'credential',$3,$4,NOW(),NOW())`,
      [randomUUID(), USER_EMAIL, USER_ID, passwordHash],
    )
    console.log("[prepare-auth] user created")
  } finally {
    await pool.end()
  }

  console.log("[prepare-auth] signing in via HTTP…")
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>")
    throw new Error(`[prepare-auth] sign-in returned ${res.status}: ${body}`)
  }

  const setCookies = res.headers.getSetCookie?.() ?? []
  const sessionLine = setCookies.find((c) =>
    c.includes("better-auth.session_token"),
  )
  if (!sessionLine) {
    throw new Error(
      `[prepare-auth] no session cookie. Got: ${setCookies.join(" | ")}`,
    )
  }

  const eqIdx = sessionLine.indexOf("=")
  const cookieName = sessionLine.slice(0, eqIdx).trim()
  const cookieValue = decodeURIComponent(
    sessionLine.slice(eqIdx + 1).split(";")[0].trim(),
  )

  const domain = process.env.REPLIT_DEV_DOMAIN ?? "127.0.0.1"
  const secure = !!process.env.REPLIT_DEV_DOMAIN

  const storageState = {
    cookies: [
      {
        name: cookieName,
        value: cookieValue,
        domain,
        path: "/",
        expires: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
        httpOnly: true,
        sameSite: "Lax",
        secure,
      },
    ],
    origins: [],
  }

  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true })
  writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2))
  console.log(`[prepare-auth] storageState written to ${STORAGE_STATE_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
