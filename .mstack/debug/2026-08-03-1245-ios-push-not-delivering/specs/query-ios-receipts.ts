// Hypothesis-verifying script for iOS-push-not-delivering.
//
// The Iron Law demands a failing artifact that pinpoints the CAUSE,
// not the symptom. For this bug the cause lives outside our code
// (EAS/Apple credentials), so the artifact is a receipt-poll against
// the Expo Push Service: for every iOS `ticket_id` recently written
// to notification_delivery, we ask Expo "what did APNs actually do
// with this?"
//
// Expected FAIL signal — one of:
//   1. MismatchSenderId    → APNs Key uploaded to EAS is for a
//                            different bundle ID.
//   2. InvalidCredentials  → APNs Key not uploaded, or expired,
//                            or scoped to sandbox while the build
//                            targets production (or vice-versa).
//   3. DeviceNotRegistered → the recipient's token is gone (they
//                            uninstalled or the token rotated); also
//                            happens when the whole APNs delivery
//                            chain is misconfigured and Apple returns
//                            410 for every push under the misconfigured
//                            key.
//
// Expected PASS signal (bug is elsewhere) — receipts all say
//   status: "ok"
// which would mean APNs accepted every push and the loss is on the
// user's device (permission revoked, Focus mode, iOS Silence
// Notifications on the app).
//
// Run: cd packages/db && npx tsx ../../.mstack/debug/2026-08-03-1245-ios-push-not-delivering/specs/query-ios-receipts.ts
//
// EXPO_ACCESS_TOKEN + DATABASE_URL must be in the env. Both are
// already present in Replit Secrets for this project.

import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

interface Row {
  ticket_id: string
  user_device_id: string
  status: string
  error_code: string | null
  created_at: Date
  platform: string
  expo_push_token_tail: string
}

async function main() {
  const dbUrl = process.env.DATABASE_URL
  const expoToken = process.env.EXPO_ACCESS_TOKEN
  if (!dbUrl) {
    console.error("DATABASE_URL missing")
    process.exit(1)
  }
  if (!expoToken) {
    console.error("EXPO_ACCESS_TOKEN missing")
    process.exit(1)
  }

  const pool = new Pool({ connectionString: dbUrl })

  // Grab the last 100 iOS delivery attempts that have a ticket_id
  // (status='pending' or 'ok' — anything Expo actually accepted).
  // JOIN user_device for platform + last 8 chars of the token for
  // human-readable identification.
  console.log("[query-ios-receipts] fetching recent iOS ticket ids from notification_delivery…")
  const r = await pool.query<Row>(
    `SELECT
       nd.ticket_id,
       nd.user_device_id,
       nd.status,
       nd.error_code,
       nd.created_at,
       ud.platform,
       RIGHT(ud.expo_push_token, 8) AS expo_push_token_tail
     FROM notification_delivery nd
     JOIN user_device ud ON ud.id = nd.user_device_id
     WHERE ud.platform = 'ios'
       AND nd.ticket_id IS NOT NULL
       AND nd.created_at > NOW() - INTERVAL '24 hours'
     ORDER BY nd.created_at DESC
     LIMIT 100`,
  )
  await pool.end()

  console.log(`[query-ios-receipts] found ${r.rows.length} iOS ticket(s) in the last 24h`)
  if (r.rows.length === 0) {
    console.log(
      "\n⚠️  No iOS deliveries in the last 24h — send a broadcast from /admin/users (Notify Users, By platform → iOS) then re-run this script.",
    )
    process.exit(2)
  }

  // Chunk to 1000 per Expo receipt request (their limit).
  const chunkSize = 1000
  const ticketIds = r.rows.map((row) => row.ticket_id)
  const receiptsByTicket = new Map<string, { status: string; details?: { error?: string }; message?: string }>()

  for (let i = 0; i < ticketIds.length; i += chunkSize) {
    const chunk = ticketIds.slice(i, i + chunkSize)
    console.log(`[query-ios-receipts] querying Expo receipts for ${chunk.length} ticket(s)…`)
    const resp = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        Authorization: `Bearer ${expoToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: chunk }),
    })
    if (!resp.ok) {
      console.error(`Expo receipts endpoint returned ${resp.status}: ${await resp.text()}`)
      process.exit(1)
    }
    const body = (await resp.json()) as { data: Record<string, { status: string; details?: { error?: string }; message?: string }> }
    for (const [ticketId, receipt] of Object.entries(body.data ?? {})) {
      receiptsByTicket.set(ticketId, receipt)
    }
  }

  // Report — group by receipt status/error.
  const buckets = new Map<string, Row[]>()
  const unresolved: Row[] = [] // ticket present but Expo has no receipt yet (still pending — normal for <15min)
  for (const row of r.rows) {
    const receipt = receiptsByTicket.get(row.ticket_id)
    if (!receipt) {
      unresolved.push(row)
      continue
    }
    const key =
      receipt.status === "ok"
        ? "ok"
        : `error:${receipt.details?.error ?? "unknown"}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(row)
  }

  console.log("\n═══════════════════════════════════════════════════════════════")
  console.log("iOS RECEIPT SUMMARY (last 24h, up to 100 tickets)")
  console.log("═══════════════════════════════════════════════════════════════")
  for (const [key, rows] of Array.from(buckets.entries()).sort()) {
    console.log(`\n▸ ${key}: ${rows.length} receipt(s)`)
    // Show a few examples so the user can see which devices are affected.
    for (const r of rows.slice(0, 3)) {
      console.log(
        `    device_id=${r.user_device_id.slice(0, 8)}… token…${r.expo_push_token_tail} sent=${r.created_at.toISOString()}`,
      )
    }
    if (rows.length > 3) console.log(`    …and ${rows.length - 3} more`)
  }
  if (unresolved.length > 0) {
    console.log(
      `\n▸ receipt-not-yet-available: ${unresolved.length} ticket(s) — Expo publishes receipts ~15min after send; these are likely just too fresh. Ignore unless the send was >30min ago.`,
    )
  }

  console.log("\n═══════════════════════════════════════════════════════════════")
  console.log("INTERPRETATION")
  console.log("═══════════════════════════════════════════════════════════════")
  const okCount = buckets.get("ok")?.length ?? 0
  const errorKeys = Array.from(buckets.keys()).filter((k) => k.startsWith("error:"))
  if (errorKeys.length === 0 && okCount > 0) {
    console.log("✅ Every APNs receipt returned OK. iOS side is delivering the push.")
    console.log(
      "   The loss is on the recipient's device: permission denied, Focus mode, iOS Silence Notifications on the app, Low Power Mode, or DND.",
    )
    console.log("   Ask the user to walk through Settings → Notifications → AIRA and confirm the toggle chain.")
    process.exit(0)
  }
  for (const key of errorKeys) {
    const code = key.replace("error:", "")
    console.log(`❌ ${code} — ${apnsErrorAdvice(code)}`)
  }
  process.exit(errorKeys.length > 0 ? 3 : 0)
}

function apnsErrorAdvice(code: string): string {
  switch (code) {
    case "DeviceNotRegistered":
      return "APNs returned 410 for the token. Either the user uninstalled/reinstalled, OR the entire APNs config is wrong (Apple rejects every push under the misconfigured key with 410). If EVERY iOS device is DeviceNotRegistered, it's the config, not user behaviour."
    case "MismatchSenderId":
      return "The APNs Key uploaded to EAS is bound to a different bundle ID (or different Apple Team ID) than com.airabynisarga.app. Fix: re-upload the correct .p8 via `eas credentials` or the Expo dashboard."
    case "InvalidCredentials":
      return "APNs Key missing, expired, or malformed in EAS. Fix: generate a fresh Key ID (Apple Developer → Keys → +), download the .p8, and upload via `eas credentials`."
    case "MessageTooBig":
      return "Payload >4KB. Unlikely for AIRA broadcasts (title+message capped at 120+2000)."
    case "MessageRateExceeded":
      return "Rate-limited by Expo. Slow the send loop."
    default:
      return `Unmapped APNs error — check the Expo docs at https://docs.expo.dev/push-notifications/sending-notifications/#push-receipt-errors`
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
