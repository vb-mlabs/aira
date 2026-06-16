import { chromium } from "playwright"

const BASE = "http://localhost:5000"
const OUT = "./.mstack/ux-audits/2026-06-13-marketing-mobile/assets"

const browser = await chromium.launch()
try {
  for (const v of [
    { name: "mobile", w: 390, h: 844, isMobile: true },
    { name: "desktop", w: 1440, h: 900, isMobile: false },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: v.w, height: v.h },
      deviceScaleFactor: v.isMobile ? 2 : 1,
      isMobile: v.isMobile,
      hasTouch: v.isMobile,
    })
    const page = await ctx.newPage()
    await page.goto(BASE + "?t=" + Date.now(), { waitUntil: "networkidle" })
    await page.evaluate(() => document.fonts && document.fonts.ready)
    await page.locator("button:has-text('View Launch Offer')").click()
    await page.waitForTimeout(500)
    const popup = page.locator("[role='dialog']").first()
    await popup.screenshot({ path: `${OUT}/launch-offer-${v.name}-after.png` })
    await ctx.close()
    console.log("captured launch offer", v.name)
  }
} finally {
  await browser.close()
}
