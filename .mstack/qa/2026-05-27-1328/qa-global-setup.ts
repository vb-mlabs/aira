// QA-run global setup — variant of apps/web/e2e/global-setup.ts that
// avoids the BETTER_AUTH_SECRET guard. Instead of calling auth.handler
// directly, it creates the test user via psql and then drives Playwright
// through the actual /api/auth/sign-in/email endpoint at localhost:5000
// to capture a real signed session cookie.
//
// This setup does NOT require BETTER_AUTH_SECRET to be set in the shell
// because it lets the running dev server sign the cookie.

import path from "path"
import { fileURLToPath } from "url"
import nextEnv from "@next/env"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Load env from apps/web (finds DATABASE_URL etc.)
nextEnv.loadEnvConfig(path.resolve(__dirname, "../../apps/web"))

import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { randomUUID } from "crypto"
import { chromium } from "@playwright/test"

// Reuse the stable test-user constants from the shared fixture.
export const QA_TEST_USER = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "QA Tester",
  email: "qa-tester@mlabs.test",
  password: "qa-test-password-2026",
} as const

const STORAGE_STATE_PATH = join(__dirname, ".auth", "qa-user.json")
const BASE_URL = "http://localhost:5000"

export default async function qaGlobalSetup() {
  // eslint-disable-next-line no-restricted-syntax
  const { Pool } = await import("@neondatabase/serverless")
  // eslint-disable-next-line no-restricted-syntax
  const { hashPassword } = await import("better-auth/crypto")

  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa-setup] DATABASE_URL not set")

  const pool = new Pool({ connectionString: dbUrl })

  // Wipe any leftover row from a previous run.
  await pool.query("DELETE FROM \"user\" WHERE id = $1", [QA_TEST_USER.id])

  const passwordHash = await hashPassword(QA_TEST_USER.password)

  // Insert user + credential account (mirrors global-setup.ts structure).
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, now(), now())`,
    [QA_TEST_USER.id, QA_TEST_USER.name, QA_TEST_USER.email],
  )
  await pool.query(
    `INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, 'credential', $3, $4, now(), now())`,
    [randomUUID(), QA_TEST_USER.email, QA_TEST_USER.id, passwordHash],
  )

  await pool.end()

  // Drive Playwright through the login form to get a real signed cookie.
  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()

  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.getByLabel("Email").fill(QA_TEST_USER.email)
  await page.getByLabel("Password").fill(QA_TEST_USER.password)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL(/\/home/, { timeout: 15_000 })

  // Save the cookies + localStorage that let authed specs skip the login form.
  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true })
  await context.storageState({ path: STORAGE_STATE_PATH })

  await browser.close()
}
