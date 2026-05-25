// Provision the Stripe webhook endpoint that backs /api/stripe/webhook.
//
// The webhook signing secret (whsec_...) is only returned by Stripe at
// creation time — there is no API to re-read it later. This script captures
// it on create and prints it to stdout so you can paste it into Replit
// Secrets (or .env.local) as STRIPE_WEBHOOK_SECRET.
//
// Modes (idempotent by URL):
//   pnpm stripe:webhook-setup                # create if absent, skip if exists
//   pnpm stripe:webhook-setup -- --list      # list endpoints, no writes
//   pnpm stripe:webhook-setup -- --rotate    # delete existing + recreate
//   pnpm stripe:webhook-setup -- --url=<url> # override target URL
//
// Target URL resolution: --url=... flag → STRIPE_WEBHOOK_URL env →
// ${BETTER_AUTH_URL}/api/stripe/webhook → https://${REPLIT_DEV_DOMAIN}/api/stripe/webhook.
//
// Event subscription kept in sync with packages/services/src/billing/webhook.ts.
// Stripe-handled events not in this list never reach our handler; events in
// this list we don't handle hit the default branch (recorded, not actioned).

import Stripe from "stripe"

const args = process.argv.slice(2)
const listOnly = args.includes("--list")
const rotate = args.includes("--rotate")
const urlFlag = args.find((a) => a.startsWith("--url="))?.split("=")[1]

const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "checkout.session.expired",
  "charge.succeeded",
  "payment_intent.payment_failed",
]

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error("STRIPE_SECRET_KEY is required.")
  process.exit(1)
}

const baseUrl =
  process.env.BETTER_AUTH_URL ??
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : undefined)

const targetUrl =
  urlFlag ??
  process.env.STRIPE_WEBHOOK_URL ??
  (baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/stripe/webhook` : undefined)

if (!listOnly && !targetUrl) {
  console.error(
    "Target URL required. Pass --url=<url>, set STRIPE_WEBHOOK_URL, or set BETTER_AUTH_URL.",
  )
  process.exit(1)
}

async function main() {
  const stripe = new Stripe(secretKey!, { typescript: true })

  const mode = secretKey!.startsWith("sk_live_") ? "LIVE" : "test"
  console.log(`Stripe mode: ${mode}`)

  const existing = await stripe.webhookEndpoints.list({ limit: 100 })

  if (listOnly) {
    if (existing.data.length === 0) {
      console.log("No webhook endpoints registered.")
    } else {
      for (const e of existing.data) {
        console.log(`  ${e.id}  ${e.status.padEnd(8)} ${e.url}`)
      }
    }
    return
  }

  const match = existing.data.find((e) => e.url === targetUrl)

  if (match && !rotate) {
    console.log(`✓ webhook endpoint already exists for ${targetUrl}`)
    console.log(`  id:     ${match.id}`)
    console.log(`  status: ${match.status}`)
    console.log(`  events: ${match.enabled_events.length} subscribed`)
    console.log(
      "\nRe-run with --rotate to delete + recreate (generates a new signing secret).",
    )
    return
  }

  if (match && rotate) {
    console.log(`Rotating: deleting existing endpoint ${match.id}...`)
    await stripe.webhookEndpoints.del(match.id)
  }

  console.log(`Creating webhook endpoint for ${targetUrl}...`)
  // Forks: customize this description after running pnpm rename if you
  // want it to match your brand. Stripe uses the description for the
  // Dashboard listing only — it doesn't affect routing or signing.
  const created = await stripe.webhookEndpoints.create({
    url: targetUrl!,
    enabled_events: EVENTS,
    description: "MLabs template — Stripe webhook",
  })

  if (!created.secret) {
    console.error(
      `Stripe did not return a signing secret. Endpoint was created (id: ${created.id}) but the secret cannot be recovered — delete it and re-run.`,
    )
    process.exit(1)
  }

  console.log("\n✓ Endpoint created.")
  console.log(`  id:     ${created.id}`)
  console.log(`  events: ${EVENTS.length} subscribed`)
  console.log("\nAdd this to Replit Secrets as STRIPE_WEBHOOK_SECRET, then restart the workspace:")
  console.log("")
  console.log(`  ${created.secret}`)
  console.log("")
  console.log(
    "(This secret will not be shown again. Stripe's API does not return it on subsequent reads.)",
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
