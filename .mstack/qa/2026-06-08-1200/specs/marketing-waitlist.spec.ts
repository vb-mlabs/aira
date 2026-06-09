import { test, expect } from "@playwright/test"
import path from "path"

const ASSETS = path.resolve(__dirname, "../assets")

// Helper: go to home, wait for full hydration (avoids React controlled-input reset)
async function goHome(page: Parameters<typeof test.fn>[0]["page"]) {
  await page.goto("/", { waitUntil: "networkidle" })
}

// ── Scenario 1: Marketing page loads ─────────────────────────────────────────

test("S1: marketing page loads and shows business CTAs", async ({ page }) => {
  await goHome(page)
  await page.screenshot({ path: `${ASSETS}/s1-home.png`, fullPage: false })

  // Both CTAs in the business section are visible
  await expect(
    page.getByRole("button", { name: /Get Listed Early/i }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: /View Launch Offer/i }),
  ).toBeVisible()
})

// ── Scenario 2: Get Listed Early modal opens with all fields ─────────────────

test("S2: Get Listed Early modal opens with all six fields", async ({
  page,
}) => {
  await goHome(page)

  await page.getByRole("button", { name: /Get Listed Early/i }).click()

  // Wait for dialog to appear
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await page.screenshot({ path: `${ASSETS}/s2-modal-open.png` })

  // Title
  await expect(dialog.getByRole("heading", { name: /Get your business listed/i })).toBeVisible()

  // Text inputs — use role+name to avoid ambiguity with radio "Phone"
  await expect(dialog.getByRole("textbox", { name: /Full Name/i })).toBeVisible()
  await expect(dialog.getByRole("textbox", { name: /Business Name/i })).toBeVisible()
  await expect(dialog.getByRole("textbox", { name: /Phone Number/i })).toBeVisible()
  await expect(dialog.getByRole("textbox", { name: /Email Address/i })).toBeVisible()

  // Radio groups (fieldsets)
  await expect(dialog.getByRole("group", { name: /Best way to contact/i })).toBeVisible()
  await expect(dialog.getByRole("group", { name: /Best time to contact/i })).toBeVisible()

  // Contact options — use role to avoid matching the tel input labelled "Phone Number"
  await expect(dialog.getByRole("radio", { name: "Phone" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "WhatsApp" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "Email" })).toBeVisible()

  // Time options
  await expect(dialog.getByRole("radio", { name: "Morning" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "Afternoon" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "Evening" })).toBeVisible()
  await expect(dialog.getByRole("radio", { name: "Anytime" })).toBeVisible()

  // Submit button present
  const submitBtn = dialog.getByRole("button", { name: /Request Listing/i })
  await expect(submitBtn).toBeVisible()
})

// ── Scenario 3: Radio pill selection ─────────────────────────────────────────

test("S3: radio pill selections toggle correctly", async ({ page }) => {
  await goHome(page)
  await page.getByRole("button", { name: /Get Listed Early/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // Click visible label pills (sr-only inputs are hidden behind labels)
  await dialog.locator("label").filter({ hasText: /^WhatsApp$/ }).click()
  const whatsappInput = dialog.locator('input[name="preferred_contact"][value="whatsapp"]')
  await expect(whatsappInput).toBeChecked()

  await dialog.locator("label").filter({ hasText: /^Phone$/ }).click()
  const phoneInput = dialog.locator('input[name="preferred_contact"][value="phone"]')
  await expect(phoneInput).toBeChecked()
  await expect(whatsappInput).not.toBeChecked()

  await dialog.locator("label").filter({ hasText: /^Evening$/ }).click()
  const eveningInput = dialog.locator('input[name="preferred_time"][value="evening"]')
  await expect(eveningInput).toBeChecked()

  await page.screenshot({ path: `${ASSETS}/s3-radio-selection.png` })
})

// ── Scenario 4: Happy path submission (API mocked 200) ────────────────────────

test("S4: form submission happy path shows thank-you state", async ({
  page,
}) => {
  // Mock the business-waitlist API to return success
  await page.route("**/api/v1/business-waitlist", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
  })

  await goHome(page)
  await page.getByRole("button", { name: /Get Listed Early/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // Fill all fields
  await dialog.getByRole("textbox", { name: /Full Name/i }).fill("Jane Smith")
  await dialog.getByRole("textbox", { name: /Business Name/i }).fill("Acme Spices")
  await dialog.getByRole("textbox", { name: /Phone Number/i }).fill("+1 404 555 0100")
  await dialog.getByRole("textbox", { name: /Email Address/i }).fill("jane@acme.com")
  // Click visible label pills (sr-only radios sit behind labels)
  await dialog.locator("label").filter({ hasText: /^WhatsApp$/ }).click()
  await dialog.locator("label").filter({ hasText: /^Morning$/ }).click()

  await page.screenshot({ path: `${ASSETS}/s4-filled-form.png` })

  // Submit
  await dialog.getByRole("button", { name: /Request Listing/i }).click()

  // Thank-you state should appear
  await expect(dialog.getByText(/Request received/i)).toBeVisible({ timeout: 5000 })
  await expect(dialog.getByText(/we'll be in touch/i)).toBeVisible()
  await expect(dialog.getByRole("button", { name: /Close/i })).toBeVisible()

  await page.screenshot({ path: `${ASSETS}/s4-success-state.png` })
})

// ── Scenario 5: Error state (API mocked 500) ─────────────────────────────────

test("S5: form shows inline error on API failure", async ({ page }) => {
  await page.route("**/api/v1/business-waitlist", (route) => {
    route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"server error"}' })
  })

  await goHome(page)
  await page.getByRole("button", { name: /Get Listed Early/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  await dialog.getByRole("textbox", { name: /Full Name/i }).fill("Jane Smith")
  await dialog.getByRole("textbox", { name: /Business Name/i }).fill("Acme Spices")
  await dialog.getByRole("textbox", { name: /Phone Number/i }).fill("+1 404 555 0100")
  await dialog.getByRole("textbox", { name: /Email Address/i }).fill("jane@acme.com")
  await dialog.locator("label").filter({ hasText: /^Phone$/ }).click()
  await dialog.locator("label").filter({ hasText: /^Anytime$/ }).click()

  await dialog.getByRole("button", { name: /Request Listing/i }).click()

  // Inline error message should appear; form should NOT be replaced
  await expect(dialog.getByRole("alert")).toBeVisible({ timeout: 5000 })
  await expect(dialog.getByRole("textbox", { name: /Full Name/i })).toBeVisible()

  // Submit button re-enabled after error
  await expect(
    dialog.getByRole("button", { name: /Request Listing/i }),
  ).not.toBeDisabled()

  await page.screenshot({ path: `${ASSETS}/s5-error-state.png` })
})

// ── Scenario 6: Dismiss modal ─────────────────────────────────────────────────

test("S6: Cancel button closes the Get Listed Early modal", async ({ page }) => {
  await goHome(page)
  await page.getByRole("button", { name: /Get Listed Early/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  await dialog.getByRole("button", { name: /Cancel/i }).click()
  await expect(dialog).not.toBeVisible({ timeout: 2000 })
})

// ── Scenario 7: View Launch Offer modal regression ────────────────────────────

test("S7: View Launch Offer modal opens and renders offer content", async ({
  page,
}) => {
  await goHome(page)

  await page.getByRole("button", { name: /View Launch Offer/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  await page.screenshot({ path: `${ASSETS}/s7-launch-offer.png` })

  // Title and subtitle
  await expect(dialog.getByRole("heading", { name: /Founding Launch Offer/i })).toBeVisible()
  await expect(dialog.getByText(/For businesses joining during launch week/i)).toBeVisible()

  // Perks
  await expect(dialog.getByText(/FREE.*AIRA Verified Badge/i)).toBeVisible()
  await expect(dialog.getByText(/FREE.*1 Month Featured/i)).toBeVisible()
  await expect(dialog.getByText(/\+1 Extra Month/i)).toBeVisible()

  // Regular Plans section
  await expect(dialog.getByRole("heading", { name: /Regular Plans/i })).toBeVisible()
  // Use exact match to avoid matching 4 "Membership" occurrences in the grid
  await expect(dialog.getByText("Membership", { exact: true }).first()).toBeVisible()
  await expect(dialog.getByText("$149").first()).toBeVisible()

  // Close button works
  await dialog.getByRole("button", { name: /Close/i }).click()
  await expect(dialog).not.toBeVisible({ timeout: 2000 })
})

// ── Scenario 8: Consumer waitlist form present in hero ────────────────────────

test("S8: consumer waitlist form present in hero section", async ({
  page,
}) => {
  await goHome(page)
  await page.screenshot({ path: `${ASSETS}/s8-home-full.png`, fullPage: true })

  // Hero waitlist input — WaitlistCard is rendered in the hero, not the footer
  // Locate an email input that is NOT inside the business modal trigger area
  await expect(
    page.locator('input[type="email"]').first(),
  ).toBeVisible()
})
