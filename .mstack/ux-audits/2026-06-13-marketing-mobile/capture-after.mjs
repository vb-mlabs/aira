import { chromium } from "playwright"

const BASE = "http://localhost:5000"
const OUT = "./.mstack/ux-audits/2026-06-13-marketing-mobile/assets"

const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  })
  const page = await ctx.newPage()
  // hard reload to bypass any HMR cache
  await page.goto(BASE + "?after=" + Date.now(), { waitUntil: "networkidle", timeout: 60_000 })
  await page.evaluate(() => document.fonts && document.fonts.ready)
  await page.waitForTimeout(800)

  await page.screenshot({ path: `${OUT}/marketing-mobile-full-after.png`, fullPage: true })
  await page.screenshot({ path: `${OUT}/marketing-mobile-hero-after.png`, fullPage: false })

  const sections = [
    { sel: "section:has(h1)", file: "hero" },
    { sel: "#about", file: "about" },
    { sel: "section:has(img[alt*='home screen'])", file: "phone-showcase" },
    { sel: "#businesses", file: "business-panel" },
  ]
  for (const s of sections) {
    const el = page.locator(s.sel).first()
    if ((await el.count()) === 0) continue
    await el.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await el.screenshot({ path: `${OUT}/marketing-mobile-section-${s.file}-after.png` })
  }

  // Confirm scroll-margin-top by clicking a hash and reading offsetTop relative to viewport
  await page.goto(BASE + "#about", { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  const about = await page
    .locator("#about")
    .first()
    .evaluate((el) => el.getBoundingClientRect().top)
  console.log("after-fix #about top relative to viewport (should be ≥ ~80):", about)

  await page.goto(BASE + "#businesses", { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  const biz = await page
    .locator("#businesses")
    .first()
    .evaluate((el) => el.getBoundingClientRect().top)
  console.log("after-fix #businesses top relative to viewport (should be ≥ ~80):", biz)

  await ctx.close()
} finally {
  await browser.close()
}
