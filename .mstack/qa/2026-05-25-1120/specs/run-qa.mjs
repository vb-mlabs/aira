// Scenario-driven QA for the AIRA marketing page (post-T12).
// Drives Chromium headless via Playwright's core API (no test runner) and
// emits a JSON summary to .mstack/qa/<run>/results.json + screenshots into
// assets/. The parent run synthesises the report from the JSON.
//
// Usage:  node .mstack/qa/2026-05-25-1120/specs/run-qa.mjs

import { chromium, devices } from "playwright"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const RUN_DIR = dirname(HERE)
const ASSETS = join(RUN_DIR, "assets")
const BASE = process.env.QA_BASE_URL || "http://localhost:5000"

const findings = []
function note(scenario, level, message, extra = {}) {
  findings.push({ scenario, level, message, ...extra })
}

async function withConsoleCapture(page) {
  const errors = []
  const warnings = []
  const requests404 = []
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text())
    if (msg.type() === "warning") warnings.push(msg.text())
  })
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`))
  page.on("response", (res) => {
    if (res.status() === 404) requests404.push(res.url())
  })
  return { errors, warnings, requests404 }
}

async function scenarioDesktopRender(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const cap = await withConsoleCapture(page)

  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 })
  await page.screenshot({ path: join(ASSETS, "01-desktop-home-top.png"), fullPage: false })
  await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(ASSETS, "02-desktop-home-bottom.png"), fullPage: false })
  await page.screenshot({ path: join(ASSETS, "03-desktop-home-full.png"), fullPage: true })

  // Section presence sweep
  const headings = await page.locator("h1, h2, h3").allTextContents()
  const expected = [
    "A directory of Atlanta",     // hero
    "scraped data",               // about
    "doctors",                    // categories
    "actually",                   // phone showcase
    "looks first",                // business panel
  ]
  for (const want of expected) {
    const found = headings.some((h) => h.includes(want))
    if (!found) {
      note("desktop-render", "high", `Heading containing "${want}" not found on /`)
    }
  }

  // Footer signature
  const footer = await page.locator("footer").innerText()
  if (!footer.includes("Operated by Nisarga Group LLC")) {
    note("desktop-render", "medium", `Footer missing "Operated by Nisarga Group LLC" signature`)
  }

  // Fonts loaded — check computed font-family on a heading
  const heroFont = await page.locator("h1").first().evaluate((el) => {
    return getComputedStyle(el).fontFamily
  })
  if (!/cormorant/i.test(heroFont)) {
    note("desktop-render", "high", `Hero <h1> is not rendering in Cormorant Garamond`, { actualFont: heroFont })
  }
  const bodyFont = await page.locator("body").evaluate((el) => {
    return getComputedStyle(el).fontFamily
  })
  if (!/lato/i.test(bodyFont)) {
    note("desktop-render", "high", `Body is not rendering in Lato`, { actualFont: bodyFont })
  }

  if (cap.errors.length) note("desktop-render", "medium", `Console errors on /`, { errors: cap.errors })
  if (cap.warnings.length) note("desktop-render", "low", `Console warnings on /`, { warnings: cap.warnings.slice(0, 5) })
  if (cap.requests404.length) note("desktop-render", "high", `404 responses on /`, { urls: cap.requests404 })

  await ctx.close()
}

async function scenarioFormHappyPath(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const cap = await withConsoleCapture(page)

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" })
  await page.locator('input[type="email"]').first().fill("qa+happy-path@aira-test.example.com")
  await page.screenshot({ path: join(ASSETS, "04-form-filled.png"), clip: { x: 0, y: 0, width: 1280, height: 800 } })

  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/v1/waitlist") && res.request().method() === "POST",
      { timeout: 10000 },
    ),
    page.locator('button[type="submit"]').first().click(),
  ])

  // Wait for the success state
  await page.waitForSelector('text=/Thanks/', { timeout: 5000 })
  await page.screenshot({ path: join(ASSETS, "05-form-success.png"), clip: { x: 0, y: 0, width: 1280, height: 800 } })

  const successText = await page.locator('text=/Thanks/').first().innerText()
  if (!successText.toLowerCase().includes("on the list")) {
    note("form-happy-path", "medium", `Success state text changed`, { actual: successText })
  }

  if (cap.errors.length) note("form-happy-path", "high", `Console errors during form submit`, { errors: cap.errors })
  if (cap.requests404.length) note("form-happy-path", "high", `404 during form flow`, { urls: cap.requests404 })

  await ctx.close()
}

async function scenarioFormInvalid(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const cap = await withConsoleCapture(page)

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" })

  // Use a value that passes HTML5's permissive type=email check ("a@b") but
  // fails server-side Zod's strict email schema (needs a TLD). This exercises
  // the SERVER's 400 path without having to bypass client validation.
  await page.locator('input[type="email"]').first().fill("a@b")

  const respPromise = page.waitForResponse(
    (res) => res.url().includes("/api/v1/waitlist"),
    { timeout: 10000 },
  )
  await page.locator('button[type="submit"]').first().click()
  const resp = await respPromise
  const status = resp.status()

  if (status !== 400) {
    note("form-invalid", "high", `Invalid email expected 400, got ${status}`, { status })
  }

  // Inline alert should appear. Scroll the WaitlistCard into view first so
  // the screenshot actually shows the form area (it sits near the bottom
  // of the hero, beyond the 800px viewport crop).
  try {
    await page.waitForSelector('[role="alert"]', { timeout: 3000 })
    await page.evaluate(() => {
      document.querySelector('#notify')?.scrollIntoView({ block: "center" })
    })
    await page.waitForTimeout(300)
    await page.screenshot({ path: join(ASSETS, "06-form-invalid-error.png"), clip: { x: 0, y: 0, width: 1280, height: 800 } })
  } catch {
    note("form-invalid", "high", `No role="alert" element appeared after 400`)
    await page.screenshot({ path: join(ASSETS, "06-form-invalid-error.png"), fullPage: true })
  }

  if (cap.errors.length) {
    // Filter out the expected 400 console error from fetch
    const real = cap.errors.filter((e) => !/400|Bad Request/.test(e))
    if (real.length) note("form-invalid", "medium", `Unexpected console errors during invalid-email flow`, { errors: real })
  }

  await ctx.close()
}

async function scenarioTabOrder(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" })

  // Click on the email input to ensure focus is on the form, then tab.
  await page.locator('input[type="email"]').first().focus()

  // Tab once — should land on submit button, NOT honeypot
  await page.keyboard.press("Tab")
  const focused = await page.evaluate(() => {
    const el = document.activeElement
    return {
      tag: el?.tagName,
      type: el?.getAttribute("type"),
      id: el?.id,
      ariaHidden: el?.getAttribute("aria-hidden"),
      tabIndex: el?.tabIndex,
      textContent: el?.textContent?.slice(0, 50),
    }
  })

  // Expect focus to be on the submit button. Honeypot is aria-hidden + tabIndex=-1.
  if (focused.tag !== "BUTTON" || focused.type !== "submit") {
    note("tab-order", "high", `After email input, Tab should land on submit button`, { focused })
  }
  if (focused.ariaHidden === "true") {
    note("tab-order", "critical", `Honeypot field is reachable via keyboard tab!`, { focused })
  }

  await ctx.close()
}

async function scenarioMobile(browser, deviceName, fileSlug) {
  const device = devices[deviceName]
  if (!device) {
    note("mobile", "low", `Playwright doesn't have device "${deviceName}" in registry — skipping`)
    return
  }
  const ctx = await browser.newContext({ ...device })
  const page = await ctx.newPage()
  const cap = await withConsoleCapture(page)

  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 })
  await page.screenshot({ path: join(ASSETS, `10-mobile-${fileSlug}-home-top.png`), fullPage: false })
  await page.screenshot({ path: join(ASSETS, `11-mobile-${fileSlug}-home-full.png`), fullPage: true })

  // Check no horizontal scroll
  const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  if (hasHScroll) {
    const widths = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }))
    note("mobile", "high", `Horizontal scroll detected on ${deviceName}`, { widths })
  }

  // Scroll to phone showcase + screenshot
  await page.evaluate(() => {
    const phones = document.querySelectorAll('img[alt*="screen" i], img[alt*="business" i]')
    phones[0]?.scrollIntoView({ block: "center" })
  })
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(ASSETS, `12-mobile-${fileSlug}-phone-showcase.png`), fullPage: false })

  // Scroll to business panel
  await page.evaluate(() => {
    document.querySelector("#businesses")?.scrollIntoView({ block: "start" })
  })
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(ASSETS, `13-mobile-${fileSlug}-business-panel.png`), fullPage: false })

  if (cap.errors.length) note(`mobile-${fileSlug}`, "medium", `Console errors on ${deviceName}`, { errors: cap.errors })
  if (cap.requests404.length) note(`mobile-${fileSlug}`, "high", `404 responses on ${deviceName}`, { urls: cap.requests404 })

  await ctx.close()
}

async function scenarioCrossRoute(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const cap = await withConsoleCapture(page)

  for (const path of ["/privacy", "/terms", "/dev/emails"]) {
    cap.errors.length = 0
    cap.requests404.length = 0
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch((e) => {
      note("cross-route", "high", `Navigation to ${path} threw`, { error: e.message })
    })
    await page.screenshot({ path: join(ASSETS, `20-route-${path.replace(/\//g, "_")}.png`), fullPage: false })
    if (cap.errors.length) note("cross-route", "medium", `Console errors on ${path}`, { errors: cap.errors.slice(0, 5) })
    if (cap.requests404.length) note("cross-route", "high", `404s on ${path}`, { urls: cap.requests404 })
  }

  await ctx.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    await scenarioDesktopRender(browser)
    await scenarioFormHappyPath(browser)
    await scenarioFormInvalid(browser)
    await scenarioTabOrder(browser)
    await scenarioMobile(browser, "iPhone 14 Pro", "iphone")
    await scenarioMobile(browser, "Pixel 7", "pixel")
    await scenarioCrossRoute(browser)
  } finally {
    await browser.close()
  }

  const summary = {
    timestamp: new Date().toISOString(),
    base: BASE,
    totalFindings: findings.length,
    bySeverity: findings.reduce((acc, f) => {
      acc[f.level] = (acc[f.level] || 0) + 1
      return acc
    }, {}),
    findings,
  }
  writeFileSync(join(RUN_DIR, "results.json"), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error("QA RUN FAILED:", err)
  process.exit(1)
})
