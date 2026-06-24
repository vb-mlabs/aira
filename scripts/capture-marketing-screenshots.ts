// One-off: drive Playwright against the running dev server to capture
// real-app portrait screenshots for the marketing landing page's
// PhoneShowcase section. Replaces the old static mockups at
// apps/web/public/marketing-images/{home-screen,business-listing}.png.
//
// Usage:
//   pnpm tsx scripts/capture-marketing-screenshots.ts
//
// Requirements:
//   - Dev server reachable at http://localhost:5000
//   - A valid better-auth session cookie passed via SESSION_COOKIE env var,
//     or fall back to reading the most recent .mstack/qa run's admin.json.
//
// Viewport is sized so the screenshot's aspect ratio matches the 9:22
// PhoneFrame mask in apps/web/src/components/marketing/phone-showcase.tsx —
// no content gets cropped by the mask once the image lands inside the
// frame.

import { chromium } from "@playwright/test"
import { mkdirSync, readFileSync, readdirSync, statSync } from "fs"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, "..")
const OUT_DIR = join(REPO_ROOT, "apps/web/public/marketing-images")
const BASE_URL = process.env.BASE_URL ?? "http://localhost:5000"

// 9:22 == the PhoneFrame aspect mask. 390 wide is iPhone-ish, 953 tall
// keeps the ratio exact. Lock DPR to 2 so the output is crisp.
const VIEWPORT = { width: 390, height: 953 }
const DEVICE_SCALE_FACTOR = 2

interface ShotPlan {
  url: string
  out: string
  // Substrings on visible card text; matching cards are hidden before
  // capture. Currently used to scrub QA seed entries
  // ("QA Linked Cafe", "QA Unlinked Bakery") from the real listings page.
  hideCardsContaining?: string[]
}

const SHOTS: ShotPlan[] = [
  {
    url: `${BASE_URL}/home`,
    out: join(OUT_DIR, "home-screen.png"),
    hideCardsContaining: ["QA ", "QA]", "[QA", "qa-biz-"],
  },
  {
    url: `${BASE_URL}/listings/restaurants`,
    out: join(OUT_DIR, "business-listing.png"),
    hideCardsContaining: ["QA ", "QA]", "[QA", "qa-biz-"],
  },
]

function resolveSessionCookie(): { name: string; value: string } {
  if (process.env.SESSION_COOKIE) {
    const eq = process.env.SESSION_COOKIE.indexOf("=")
    if (eq < 0) {
      throw new Error("[capture] SESSION_COOKIE must be name=value")
    }
    return {
      name: process.env.SESSION_COOKIE.slice(0, eq),
      value: process.env.SESSION_COOKIE.slice(eq + 1),
    }
  }
  // Fall back to most recent .mstack/qa/*/.auth/admin.json
  const qaRoot = join(REPO_ROOT, ".mstack/qa")
  const runs = readdirSync(qaRoot)
    .map((name) => ({ name, path: join(qaRoot, name) }))
    .filter((e) => statSync(e.path).isDirectory())
    .sort((a, b) => b.name.localeCompare(a.name))
  for (const run of runs) {
    const candidate = join(run.path, ".auth/admin.json")
    try {
      const json = JSON.parse(readFileSync(candidate, "utf-8")) as {
        cookies?: Array<{ name: string; value: string }>
      }
      const sessionCookie = json.cookies?.find((c) =>
        /better-auth\.session_token$/.test(c.name),
      )
      if (sessionCookie) {
        console.log(`[capture] using session cookie from ${candidate}`)
        return { name: sessionCookie.name, value: sessionCookie.value }
      }
    } catch {
      // try next
    }
  }
  throw new Error(
    "[capture] no SESSION_COOKIE set and no admin.json found under .mstack/qa/*",
  )
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true })
  const cookie = resolveSessionCookie()
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    // Pretend to be a phone so any UA-based media queries pick the
    // mobile branch.
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    // Send the better-auth session token as a header on every request.
    // Easier than addCookies() because the cookie has a __Secure- prefix
    // that Chrome refuses to accept over http://, but the server itself
    // happily reads it out of the Cookie header either way.
    extraHTTPHeaders: {
      Cookie: `${cookie.name}=${cookie.value}`,
    },
  })

  for (const shot of SHOTS) {
    const page = await context.newPage()
    console.log(`[capture] navigating ${shot.url}`)
    await page.goto(shot.url, { waitUntil: "networkidle", timeout: 30_000 })
    // Give the page a tick for any lazy images.
    await page.waitForTimeout(800)
    if (shot.hideCardsContaining?.length) {
      await page.evaluate((needles: string[]) => {
        const cards = Array.from(
          document.querySelectorAll<HTMLElement>("article, li, [data-business-card]"),
        )
        for (const card of cards) {
          const text = card.textContent ?? ""
          if (needles.some((n) => text.includes(n))) {
            card.style.display = "none"
          }
        }
      }, shot.hideCardsContaining)
      await page.waitForTimeout(150)
    }
    await page.screenshot({
      path: shot.out,
      fullPage: false,
      type: "png",
    })
    console.log(`[capture] wrote ${shot.out}`)
    await page.close()
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
