import { chromium, devices } from "playwright"

const BASE = "http://localhost:5000"
const OUT = "./.mstack/ux-audits/2026-06-13-marketing-mobile/assets"

const viewports = [
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
]

const browser = await chromium.launch()
try {
  for (const v of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: v.deviceScaleFactor,
      isMobile: v.isMobile,
      hasTouch: v.hasTouch,
      userAgent: v.isMobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : undefined,
    })
    const page = await ctx.newPage()
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 60_000 })
    // Wait for fonts + textures to load
    await page.evaluate(() => document.fonts && document.fonts.ready)
    await page.waitForTimeout(800)

    // Full-page
    await page.screenshot({ path: `${OUT}/marketing-${v.name}-full.png`, fullPage: true })

    // Above the fold (hero only)
    await page.screenshot({ path: `${OUT}/marketing-${v.name}-hero.png`, fullPage: false })

    // Section-by-section
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
      await el.screenshot({ path: `${OUT}/marketing-${v.name}-section-${s.file}.png` })
    }

    // Capture computed-style snapshot for hero + about for analysis
    const dom = await page.evaluate(() => {
      const pick = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return {
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          font: { family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, lineHeight: cs.lineHeight },
          color: cs.color,
          margin: cs.margin,
          padding: cs.padding,
        }
      }
      return {
        h1: pick("h1"),
        rootsReach: pick("section:has(h1) > p"),
        logo: pick("section:has(h1) img"),
        waitlistCard: pick("section:has(h1) form, section:has(h1) [class*='waitlist']"),
        aboutEyebrow: pick("#about header span"),
        aboutH2: pick("#about h2"),
        aboutLead: pick("#about .about-drop-cap"),
        appH2: pick("section:has(img[alt*='home screen']) h2"),
        appP: pick("section:has(img[alt*='home screen']) p"),
        businessH2: pick("#businesses h2"),
        businessP: pick("#businesses > div > div p"),
      }
    })
    const fs = await import("node:fs/promises")
    await fs.writeFile(`${OUT}/computed-${v.name}.json`, JSON.stringify(dom, null, 2))

    // Console errors
    const logs = []
    page.on("console", (msg) => msg.type() === "error" && logs.push(msg.text()))
    await page.reload({ waitUntil: "networkidle" })
    if (logs.length) await fs.writeFile(`${OUT}/console-${v.name}.log`, logs.join("\n"))

    await ctx.close()
    console.log(`captured ${v.name}`)
  }
} finally {
  await browser.close()
}
