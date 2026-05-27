// Diagnostic: what does GET /api/auth/get-session return for a bearer-authed
// session whose last_activity_at is 31 minutes in the past? Reveals whether
// Better Auth's bearer plugin surfaces the additionalFields.last_activity_at
// at all.

import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"
import { randomBytes } from "node:crypto"

neonConfig.webSocketConstructor = ws
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const adminId = "qa-diag-" + randomBytes(6).toString("hex")
  const token = randomBytes(24).toString("base64url")
  const sessionId = randomBytes(16).toString("hex")

  await pool.query(
    `INSERT INTO "user" (id, name, email, email_verified, role, notifications_updated_at, messages_updated_at, created_at, updated_at)
     VALUES ($1, $2, $3, true, 'admin', NOW(), NOW(), NOW(), NOW())`,
    [adminId, "QA Diag", adminId + "@qa.local"],
  )
  await pool.query(
    `INSERT INTO "session" (id, expires_at, token, user_id, last_activity_at, updated_at, created_at)
     VALUES ($1, NOW() + INTERVAL '7 days', $2, $3, NOW() - INTERVAL '31 minutes', NOW(), NOW())`,
    [sessionId, token, adminId],
  )

  const url =
    "https://" + process.env.REPLIT_DEV_DOMAIN + "/api/auth/get-session"
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  console.log("STATUS:", res.status)
  console.log("BODY:", await res.text())

  await pool.query(`DELETE FROM "session" WHERE id = $1`, [sessionId])
  await pool.query(`DELETE FROM "user" WHERE id = $1`, [adminId])
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
