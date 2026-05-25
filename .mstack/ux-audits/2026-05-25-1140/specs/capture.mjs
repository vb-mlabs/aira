// UX audit capture — desktop 1440x900 + mobile 390x844, full-page + section
// close-ups. Reusable across runs; saves to ../assets/.

import { chromium, devices } from "playwright"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const RUN_DIR = dirname(HERE)
const ASSETS = join(RUN_DIR, "assets")
const BASE = process.env.UX_BASE_URL || "http://localhost:5000"

// Sections in DOM order. Each is captured at desktop + mobile.
const sections = [
  { id: "nav",        sel: "nav",                            label: "01-nav" },
  { id: "hero",       sel: "section:has(img[alt*=tree-of-life])", label: "02-hero" },
  { id: "about",      sel: "section:has(.about-drop-cap), section:has(:text('Why we built this'))", label: "03-about" },
  { id: "categories", sel: "#categories",                    label: "04-categories" },
  { id: "phone",      sel: "section:has(:text('Built for the way you'))", label: "05-phone" },
  { id: "businesses", sel: "#businesses",                    label: "06-businesses" },
  { id: "footer",     sel: "footer",                         label: "07-footer" },
]

async function captureAt(browser, ctxOpts, fileSuffix) {
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 })

  // Full page
  await page.screenshot({
    path: join(ASSETS, `landing-${fileSuffix}-full.png`),
    fullPage: true,
  })

  // Per-section close-ups
  for (const s of sections) {
    try {
      const el = page.locator(s.sel).first()
      await el.scrollIntoViewIfNeeded({ timeout: 3000 })
      await page.waitForTimeout(150)
      await el.screenshot({
        path: join(ASSETS, `${s.label}-${fileSuffix}.png`),
        timeout: 5000,
      })
    } catch (e) {
      console.warn(`[capture] failed ${s.id} @ ${fileSuffix}:`, e.message)
    }
  }

  await ctx.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    await captureAt(
      browser,
      { viewport: { width: 1440, height: 900 } },
      "desktop",
    )
    const iphone = devices["iPhone 14 Pro"]
    await captureAt(
      browser,
      { ...iphone, viewport: { width: 390, height: 844 } },
      "mobile",
    )
  } finally {
    await browser.close()
  }
  console.log("captures complete: assets/")
}

main().catch((err) => {
  console.error("CAPTURE FAILED:", err)
  process.exit(1)
})
