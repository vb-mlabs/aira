/**
 * email-smoke
 * -----------
 * End-to-end Postmark smoke test. Validates that:
 *   1. POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL are set (without them
 *      the app silently falls back to the console driver — no real emails).
 *   2. The Postmark token is valid.
 *   3. The from-address is a verified Sender Signature on the Postmark account.
 *   4. The `verify-email` template alias exists in Postmark.
 *   5. The message is accepted for delivery.
 *
 * Uses the Postmark SDK directly (not the @mlabs/email wrapper) because
 * that wrapper is `server-only`-gated for Next.js and can't be imported from
 * a tsx script. The SDK call below mirrors what packages/email/src/drivers/
 * postmark.ts does at runtime.
 *
 * Usage:
 *   pnpm email:smoke                          # sends to POSTMARK_FROM_EMAIL
 *   pnpm email:smoke -- --to you@example.com  # send to a specific address
 *
 * Exit codes:
 *   0 — Postmark accepted the message (check inbox / Postmark Activity)
 *   1 — Misconfiguration or Postmark rejected the send (details printed)
 */

import { ServerClient } from "postmark"

async function main() {
  const argTo = (() => {
    const i = process.argv.indexOf("--to")
    return i >= 0 ? process.argv[i + 1] : undefined
  })()

  const token = process.env.POSTMARK_SERVER_TOKEN
  const from = process.env.POSTMARK_FROM_EMAIL
  const to = argTo ?? from

  console.log("Postmark smoke test")
  console.log("===================")
  console.log(
    "POSTMARK_SERVER_TOKEN:",
    token ? `set (${token.slice(0, 6)}…${token.slice(-2)})` : "MISSING",
  )
  console.log("POSTMARK_FROM_EMAIL:  ", from ?? "MISSING")
  console.log("To:                   ", to ?? "MISSING")
  console.log("")

  if (!token) {
    console.error(
      "✗ POSTMARK_SERVER_TOKEN is not set. The app will silently fall back to the\n" +
        "  console driver and no real emails will be sent. Set it in Replit Secrets\n" +
        "  (or .env.local for local dev) and re-run.",
    )
    process.exit(1)
  }
  if (!from) {
    console.error(
      "✗ POSTMARK_FROM_EMAIL is not set. Set it to a verified Sender Signature\n" +
        "  from your Postmark account (Account → Sender Signatures).",
    )
    process.exit(1)
  }
  if (!to) {
    console.error(
      "✗ No destination address. Pass --to=you@example.com or set\n" +
        "  POSTMARK_FROM_EMAIL (which the script falls back to).",
    )
    process.exit(1)
  }

  console.log(`→ Sending verify-email template to ${to}…`)

  try {
    const client = new ServerClient(token)
    const result = await client.sendEmailWithTemplate({
      From: from,
      To: to,
      TemplateAlias: "verify-email",
      TemplateModel: {
        brand_name: "Smoke Test",
        name: "Test User",
        verify_url: "https://example.com/verify-email?token=smoke-test",
      },
      MessageStream: "outbound",
    })
    console.log("")
    console.log("✓ Accepted by Postmark")
    console.log("  MessageID:", result.MessageID)
    console.log("  To:       ", result.To)
    console.log("")
    console.log("Next checks:")
    console.log("  - Look for the message in the destination inbox (and spam folder).")
    console.log("  - Cross-check the MessageID in Postmark → Servers → Activity.")
    console.log(
      "  - On a free Postmark account, only verified-recipient addresses can receive.",
    )
    process.exit(0)
  } catch (err: unknown) {
    const e = err as {
      code?: number
      ErrorCode?: number
      message?: string
      Message?: string
    }
    const code = e.code ?? e.ErrorCode
    const msg = e.message ?? e.Message ?? String(err)
    console.error("")
    console.error("✗ Postmark rejected the send")
    console.error("  Code:   ", code ?? "(none)")
    console.error("  Message:", msg)
    // Common Postmark error codes — translated to actionable hints.
    // Reference: https://postmarkapp.com/developer/api/overview#error-codes
    if (code === 10) {
      console.error(
        "  → 'Bad or missing API token' — check POSTMARK_SERVER_TOKEN. Make sure\n" +
          "    you copied the Server token (not the Account token).",
      )
    }
    if (code === 11) {
      console.error("  → 'Maintenance' — Postmark is in maintenance mode, retry shortly.")
    }
    if (code === 400) {
      console.error(
        "  → 'Sender signature not confirmed' — verify POSTMARK_FROM_EMAIL in\n" +
          "    Postmark UI (Account → Sender Signatures), then re-run.",
      )
    }
    if (code === 412) {
      console.error(
        "  → 'Account pending approval' — new Postmark accounts can only send\n" +
          "    to recipients on the same domain as POSTMARK_FROM_EMAIL until\n" +
          "    the account is approved. Request approval in the Postmark UI\n" +
          "    (Account → Account Approval), or test with a same-domain\n" +
          "    recipient in the meantime.",
      )
    }
    if (code === 405) {
      console.error(
        "  → 'Inactive recipient' — Postmark suppressed this address after a\n" +
          "    prior bounce or spam complaint. Reactivate in Activity → Suppressions.",
      )
    }
    if (code === 1101) {
      console.error(
        "  → 'Template alias not found' — create a 'verify-email' template in\n" +
          "    Postmark (Servers → Templates → New) before the app can send.",
      )
    }
    process.exit(1)
  }
}

main()
