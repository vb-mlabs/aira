// Verify mobile light-mode pinning. Captures the Expo Web build at phone
// viewport in two modes:
//   1. Default (OS = light)        → should look normal
//   2. Emulated OS = dark          → should STILL look normal (forced light)
//
// If the dark-emulated screenshot shows distorted dark-tinted UI, the
// userInterfaceStyle / useColorScheme pin isn't taking effect on web.

import { chromium, devices } from "playwright"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ASSETS = join(dirname(HERE), "assets")
const BASE = "http://localhost:8080"

async function capture(browser, ctxOpts, suffix) {
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 })
  // Expo Web mounts asynchronously — give it a beat after networkidle.
  await page.waitForTimeout(800)
  await page.screenshot({
    path: join(ASSETS, `mobile-${suffix}.png`),
    fullPage: true,
  })
  await ctx.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const iphone = devices["iPhone 14 Pro"]
  try {
    await capture(
      browser,
      { ...iphone, viewport: { width: 390, height: 844 }, colorScheme: "light" },
      "os-light",
    )
    await capture(
      browser,
      { ...iphone, viewport: { width: 390, height: 844 }, colorScheme: "dark" },
      "os-dark-emulated",
    )
  } finally {
    await browser.close()
  }
  console.log("mobile captures: assets/mobile-os-light.png, assets/mobile-os-dark-emulated.png")
}

main().catch((err) => {
  console.error("VERIFY FAILED:", err)
  process.exit(1)
})
