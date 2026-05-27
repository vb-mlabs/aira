#!/usr/bin/env tsx
/**
 * Live integration probe for the admin idle-timeout flow. Uses raw
 * @neondatabase/serverless to sidestep packages/db/src/client.ts's
 * `import "server-only"` guard (which throws under tsx outside Next.js).
 *
 * Steps:
 *  1. List users; pick an admin or super_admin.
 *  2. Insert a fresh Better Auth session row for that user with
 *     last_activity_at = now (skips email-verify + sign-in flow).
 *  3. Hit /admin/users with Authorization: Bearer <session-token> — expect 200.
 *  4. UPDATE session SET last_activity_at = NOW() - INTERVAL '31 minutes'.
 *  5. Re-hit /admin/users — expect 307 to /login?reason=idle.
 *  6. SELECT audit_log row with metadata.reason = 'idle_timeout'.
 *  7. Cleanup.
 */

import { Pool, neonConfig } from "@neondatabase/serverless"
import { randomBytes } from "node:crypto"
import ws from "ws"

neonConfig.webSocketConstructor = ws

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL is not set in this shell.")
  process.exit(1)
}
const pool = new Pool({ connectionString: databaseUrl })

// Tagged template helper that mirrors `neon()` but uses Pool's parameterised
// query interface (no `rows: null` quirk on empty result sets).
type SqlValue = string | number | boolean | Date | null | undefined
async function sql(
  strings: TemplateStringsArray,
  ...values: SqlValue[]
): Promise<Record<string, unknown>[]> {
  let text = ""
  for (let i = 0; i < strings.length; i++) {
    text += strings[i]
    if (i < values.length) text += `$${i + 1}`
  }
  const res = await pool.query(text, values as unknown[])
  return res.rows
}

const PREVIEW = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:5000"

type StepResult = { step: string; ok: boolean; detail?: unknown }
const results: StepResult[] = []
function step(label: string, ok: boolean, detail?: unknown) {
  results.push({ step: label, ok, detail })
  console.error(
    `${ok ? "✓" : "✗"} ${label}${detail ? " — " + JSON.stringify(detail) : ""}`,
  )
}

async function main() {
  // 1. Inspect users.
  const usersRaw = (await sql`SELECT id, email, role FROM "user" LIMIT 20`) as {
    id: string
    email: string
    role: string
  }[]
  step("users.list", true, {
    count: usersRaw.length,
    roles: [...new Set(usersRaw.map((u) => u.role))],
  })

  let admin = usersRaw.find(
    (u) => u.role === "admin" || u.role === "super_admin",
  )
  if (!admin) {
    // Create a synthetic admin for the probe. Bypasses Better Auth's sign-up
    // (which requires email verify); we're not testing the sign-up flow here.
    const tempAdminId = "qa-admin-" + randomBytes(8).toString("hex")
    await sql`
      INSERT INTO "user" (
        id, name, email, email_verified, role,
        notifications_updated_at, messages_updated_at, created_at, updated_at
      ) VALUES (
        ${tempAdminId}, ${"QA Admin"}, ${tempAdminId + "@qa.local"},
        ${true}, ${"admin"}, NOW(), NOW(), NOW(), NOW()
      )
    `
    admin = {
      id: tempAdminId,
      email: tempAdminId + "@qa.local",
      role: "admin",
    }
    step("admin.synthetic_created", true, { id: tempAdminId.slice(0, 16) + "…" })
  } else {
    step("admin.found", true, {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    })
  }

  // 2. Insert session.
  const sessionId = randomBytes(16).toString("hex")
  const token = randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await sql`
    INSERT INTO "session" (id, expires_at, token, user_id, last_activity_at, updated_at, created_at)
    VALUES (${sessionId}, ${expiresAt.toISOString()}, ${token}, ${admin.id}, NOW(), NOW(), NOW())
  `
  step("session.created", true, { id: sessionId.slice(0, 8) + "…" })

  // 3. Probe — expect 200.
  const before = await fetch(`${PREVIEW}/admin/users`, {
    redirect: "manual",
    headers: { Authorization: `Bearer ${token}` },
  })
  step("admin.fresh", before.status === 200, { status: before.status })

  // 4. Fast-forward.
  await sql`
    UPDATE "session" SET last_activity_at = NOW() - INTERVAL '31 minutes'
    WHERE id = ${sessionId}
  `
  step("session.fast-forwarded", true, { offsetMinutes: 31 })

  // 5. Re-probe — expect 307 with Location containing reason=idle.
  const after = await fetch(`${PREVIEW}/admin/users`, {
    redirect: "manual",
    headers: { Authorization: `Bearer ${token}` },
  })
  const location = after.headers.get("location") ?? ""
  step(
    "admin.bounced",
    after.status === 307 && location.includes("reason=idle"),
    { status: after.status, location },
  )

  // 6. Audit row.
  const audits = (await sql`
    SELECT action, metadata, at
    FROM audit_log
    WHERE actor_id = ${admin.id}
      AND action = 'session.revoked'
    ORDER BY at DESC
    LIMIT 5
  `) as { action: string; metadata: Record<string, unknown>; at: string }[]
  const idleRow = audits.find(
    (r) => (r.metadata as { reason?: string })?.reason === "idle_timeout",
  )
  step(
    "audit.idle_timeout_row",
    !!idleRow,
    idleRow ? { metadata: idleRow.metadata, at: idleRow.at } : { recent: audits.slice(0, 3) },
  )

  // 7. Cleanup. Session may already be deleted by the bounce; ignore failures.
  await sql`DELETE FROM "session" WHERE id = ${sessionId}`
  if (admin.id.startsWith("qa-admin-")) {
    // Synthetic user we created — purge it and its audit rows.
    await sql`DELETE FROM audit_log WHERE actor_id = ${admin.id}`
    await sql`DELETE FROM "user" WHERE id = ${admin.id}`
    step("synthetic_admin.cleanup", true)
  } else {
    step("session.cleanup", true)
  }

  await pool.end()
  const overallOk = results.every((r) => r.ok)
  console.log(
    JSON.stringify({ status: overallOk ? "pass" : "fail", results }, null, 2),
  )
  process.exit(overallOk ? 0 : 1)
}

main().catch((err) => {
  console.error("probe.crashed", err)
  console.log(
    JSON.stringify({ status: "crashed", error: String(err), results }, null, 2),
  )
  process.exit(2)
})
