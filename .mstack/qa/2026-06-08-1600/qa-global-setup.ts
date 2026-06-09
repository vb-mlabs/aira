// Lightweight QA global setup — does NOT depend on @/config/env or BETTER_AUTH_SECRET.
// Creates the e2e test user via raw SQL, signs in via HTTP, saves storageState.
// Mirrors apps/web/e2e/global-setup.ts but sidesteps the Next.js import chain.

import path from "path"
import { fileURLToPath } from "url"
import { mkdirSync, writeFileSync } from "fs"
import { dirname } from "path"
import { randomUUID } from "crypto"
import { Pool } from "@neondatabase/serverless"
import { hashPassword } from "better-auth/crypto"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const USER_ID = "00000000-0000-4000-8000-000000000001"
const USER_EMAIL = "e2e-test-primary@mlabs.test"
const USER_PASSWORD = "e2e-test-password"
const USER_NAME = "E2E Primary"

const BASE_URL = "http://127.0.0.1:5000"

const STORAGE_STATE_PATH = path.resolve(
  __dirname,
  "../../../apps/web/e2e/.auth/user.json",
)

export default async function qaGlobalSetup() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("[qa-setup] DATABASE_URL not set")

  const pool = new Pool({ connectionString: databaseUrl })
  try {
    // Delete stale user (CASCADE drops session + account rows).
    await pool.query(`DELETE FROM "user" WHERE id = $1`, [USER_ID])

    // Create fresh user with emailVerified = true.
    await pool.query(
      `INSERT INTO "user"
         (id, name, email, email_verified, role, created_at, updated_at,
          notifications_updated_at, messages_updated_at)
       VALUES ($1,$2,$3,true,'end_user',NOW(),NOW(),NOW(),NOW())`,
      [USER_ID, USER_NAME, USER_EMAIL],
    )

    // Create credential-provider account.
    const passwordHash = await hashPassword(USER_PASSWORD)
    await pool.query(
      `INSERT INTO account
         (id, account_id, provider_id, user_id, password, created_at, updated_at)
       VALUES ($1,$2,'credential',$3,$4,NOW(),NOW())`,
      [randomUUID(), USER_EMAIL, USER_ID, passwordHash],
    )
  } finally {
    await pool.end()
  }

  // Sign in via HTTP — the server handles cookie signing; we don't need BETTER_AUTH_SECRET.
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>")
    throw new Error(`[qa-setup] sign-in returned ${res.status}: ${body}`)
  }

  // Extract the session cookie.
  const setCookies: string[] = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
  const sessionLine = setCookies.find((c) =>
    c.includes("better-auth.session_token"),
  )
  if (!sessionLine) {
    throw new Error(
      `[qa-setup] no session cookie in Set-Cookie. Got: ${setCookies.join(" | ")}`,
    )
  }

  const [nameVal] = sessionLine.split(";")
  const eqIdx = nameVal.indexOf("=")
  const cookieName = nameVal.slice(0, eqIdx).trim()
  const cookieValue = decodeURIComponent(nameVal.slice(eqIdx + 1).trim())

  const storageState = {
    cookies: [
      {
        name: cookieName,
        value: cookieValue,
        domain: "127.0.0.1",
        path: "/",
        expires: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
        httpOnly: true,
        sameSite: "Lax" as const,
        secure: false,
      },
    ],
    origins: [],
  }

  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true })
  writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2))
}
