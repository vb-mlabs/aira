// QA spec: Business social links — home featured cards + business detail page.
// Focus areas from .mstack/qa/2026-06-08-1600/report.md:
//   S1. Home page loads + featured business cards render
//   S2. BusinessCard social icon row absent when no social data
//   S3. BusinessCard social icon row renders when social data present
//   S4. Business detail page social links section
//   S5. Social icon links open correct URLs (FB, IG, WA)
//
// Test data: seeds two businesses via raw SQL before the run, cleans up after.
// DB access via Pool (not @aira/db/schema) per e2e/support/auth.ts convention.

import { test, expect } from "@playwright/test"
import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"

// @neondatabase/serverless requires a WebSocket constructor in Node.
neonConfig.webSocketConstructor = ws

const ASSETS = "/home/runner/workspace/.mstack/qa/2026-06-08-1600/assets"

// Deterministic IDs so cleanup is idempotent even after a crash.
const BIZ_WITH_SOCIAL_ID = "qa-social-biz-with-links-2026-06-08"
const BIZ_NO_SOCIAL_ID = "qa-social-biz-no-links-2026-06-08"

const TEST_FB = "https://facebook.com/qa-test-biz"
const TEST_IG = "https://instagram.com/qa_test_biz"
const TEST_WA = "14045550199"

test.beforeAll(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    // Clean up any leftovers from a prior crashed run.
    await pool.query(
      `DELETE FROM businesses WHERE id = ANY($1::text[])`,
      [[BIZ_WITH_SOCIAL_ID, BIZ_NO_SOCIAL_ID]],
    )
    // Business WITH social links (tier1 → appears in featured).
    await pool.query(
      `INSERT INTO businesses
         (id, name, slug, category, tier, verified,
          facebook_url, instagram_url, whatsapp_number,
          created_at, updated_at)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        BIZ_WITH_SOCIAL_ID,
        "QA Test Biz (social links)",
        "qa-test-biz-social-links",
        "restaurants",
        "tier1",
        false,
        TEST_FB,
        TEST_IG,
        TEST_WA,
      ],
    )
    // Business WITHOUT social links (tier2 → also featured).
    await pool.query(
      `INSERT INTO businesses
         (id, name, slug, category, tier, verified,
          facebook_url, instagram_url, whatsapp_number,
          created_at, updated_at)
       VALUES
         ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, NOW(), NOW())`,
      [
        BIZ_NO_SOCIAL_ID,
        "QA Test Biz (no social)",
        "qa-test-biz-no-social",
        "restaurants",
        "tier2",
        false,
      ],
    )
  } finally {
    await pool.end()
  }
})

test.afterAll(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    await pool.query(
      `DELETE FROM businesses WHERE id = ANY($1::text[])`,
      [[BIZ_WITH_SOCIAL_ID, BIZ_NO_SOCIAL_ID]],
    )
  } finally {
    await pool.end()
  }
})

// ── S1: Home page loads and featured business cards render ────────────────────

test("S1: home page loads and featured business cards render", async ({
  page,
}) => {
  await page.goto("/home", { waitUntil: "networkidle" })
  await expect(page).toHaveURL(/\/home$/)

  // Featured Businesses heading visible
  await expect(
    page.getByRole("heading", { name: /Featured Businesses/i }),
  ).toBeVisible()

  // Our seeded tier1 business card should appear
  const card = page
    .getByRole("article")
    .filter({ hasText: "QA Test Biz (social links)" })
  await expect(card).toBeVisible()

  await page.screenshot({
    path: `${ASSETS}/s1-home-featured.png`,
    fullPage: false,
  })
})

// ── S2: BusinessCard social icon row absent when no social data ───────────────

test("S2: BusinessCard social icon row absent when no social data", async ({
  page,
}) => {
  // Use category listing page (shows ALL businesses, not capped at 6 featured).
  await page.goto("/listings/restaurants", { waitUntil: "networkidle" })

  const card = page
    .getByRole("article")
    .filter({ hasText: "QA Test Biz (no social)" })
  await expect(card).toBeVisible()

  // No social icon anchors inside this card
  await expect(card.getByLabel("Facebook")).not.toBeAttached()
  await expect(card.getByLabel("Instagram")).not.toBeAttached()
  await expect(card.getByLabel("WhatsApp")).not.toBeAttached()

  await card.screenshot({ path: `${ASSETS}/s2-card-no-social.png` })
})

// ── S3: BusinessCard social icon row renders when social data present ─────────

test("S3: BusinessCard social icon row renders when social data present", async ({
  page,
}) => {
  await page.goto("/home", { waitUntil: "networkidle" })

  const card = page
    .getByRole("article")
    .filter({ hasText: "QA Test Biz (social links)" })
  await expect(card).toBeVisible()

  // All three icons present
  await expect(card.getByLabel("Facebook")).toBeVisible()
  await expect(card.getByLabel("Instagram")).toBeVisible()
  await expect(card.getByLabel("WhatsApp")).toBeVisible()

  await card.screenshot({ path: `${ASSETS}/s3-card-with-social.png` })
})

// ── S4: Business detail page social links section ─────────────────────────────

test("S4: business detail page social links section renders", async ({
  page,
}) => {
  await page.goto(
    `/listings/restaurants/${BIZ_WITH_SOCIAL_ID}`,
    { waitUntil: "networkidle" },
  )

  // Business name heading on detail page
  await expect(
    page.getByRole("heading", { name: "QA Test Biz (social links)" }),
  ).toBeVisible()

  // Social icons visible on detail page
  await expect(page.getByLabel("Facebook")).toBeVisible()
  await expect(page.getByLabel("Instagram")).toBeVisible()
  await expect(page.getByLabel("WhatsApp")).toBeVisible()

  await page.screenshot({
    path: `${ASSETS}/s4-detail-social.png`,
    fullPage: false,
  })
})

// ── S5: Social icon links open correct URLs ───────────────────────────────────

test("S5: social icon links have correct hrefs", async ({ page }) => {
  await page.goto(
    `/listings/restaurants/${BIZ_WITH_SOCIAL_ID}`,
    { waitUntil: "networkidle" },
  )

  const fbLink = page.getByLabel("Facebook")
  const igLink = page.getByLabel("Instagram")
  const waLink = page.getByLabel("WhatsApp")

  await expect(fbLink).toHaveAttribute("href", TEST_FB)
  await expect(igLink).toHaveAttribute("href", TEST_IG)
  // WhatsApp uses wa.me/ deep-link; digits only (non-digits stripped)
  await expect(waLink).toHaveAttribute(
    "href",
    `https://wa.me/${TEST_WA.replace(/\D/g, "")}`,
  )

  // All open in new tab with correct rel
  for (const link of [fbLink, igLink, waLink]) {
    await expect(link).toHaveAttribute("target", "_blank")
    await expect(link).toHaveAttribute("rel", "noopener noreferrer")
  }

  await page.screenshot({
    path: `${ASSETS}/s5-detail-social-hrefs.png`,
    fullPage: false,
  })
})
