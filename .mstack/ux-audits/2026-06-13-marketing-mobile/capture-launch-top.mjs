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
  })
  const page = await ctx.newPage()
  await page.goto(BASE + "?t=" + Date.now(), { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts && document.fonts.ready)
  await page.locator("button:has-text('View Launch Offer')").click()
  await page.waitForTimeout(500)
  // Capture viewport (top of modal) NOT full element
  await page.screenshot({ path: `${OUT}/launch-offer-mobile-v2-top.png`, fullPage: false })
  await ctx.close()
} finally {
  await browser.close()
}
