import { test, expect, type Page } from "@playwright/test"

// QA: auth shell redesign — visual + chrome verification across the five
// (auth) routes, plus regression check that the IdleBanner still surfaces
// on /login?reason=idle after the layout rewrite.

const ASSETS = ".mstack/qa/2026-05-26-1110/assets"
const shot = (name: string) => `${ASSETS}/${name}`

// Replit's preview proxy doesn't forward _next/webpack-hmr WebSocket, so
// dev-mode HMR fails with a 502 console error. Harmless; filter it out.
const isHmrNoise = (msg: string) =>
  msg.includes("_next/webpack-hmr") || msg.includes("WebSocket connection to")

function trackConsole(page: Page): string[] {
  const errors: string[] = []
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`))
  page.on("console", (msg) => {
    if (msg.type() !== "error") return
    const text = msg.text()
    if (isHmrNoise(text)) return
    errors.push(`console: ${text}`)
  })
  return errors
}

async function expectAuthShell(page: Page) {
  // Tree-of-life logo at the top of the (auth) layout.
  await expect(page.getByRole("link", { name: /AIRA home/i })).toBeVisible()
  await expect(page.getByRole("img", { name: /AIRA logo/i })).toBeVisible()
  // AIRA by Nisarga footer at the bottom.
  await expect(page.getByText(/AIRA by Nisarga/)).toBeVisible()
}

test("/login — Welcome Back!, Sign In, AuthShell chrome", async ({ page }) => {
  const errors = trackConsole(page)
  await page.goto("/login")
  await expectAuthShell(page)
  await expect(
    page.getByRole("heading", { name: "Welcome Back!" }),
  ).toBeVisible()
  await expect(page.getByText("Sign in to continue to AIRA")).toBeVisible()
  // Email-only label per the locked decision (no phone OTP until S1.5).
  await expect(page.getByLabel("Email")).toBeVisible()
  // Use first() — "Show password" toggle also matches getByLabel('Password') in strict mode.
  await expect(page.getByLabel("Password").first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: /^Sign In$/ }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: /^Sign Up$/ }),
  ).toBeVisible()
  await page.screenshot({ path: shot("01-login.png"), fullPage: true })
  expect(errors).toEqual([])
})

test("/login?reason=idle — IdleBanner still surfaces above heading", async ({
  page,
}) => {
  await page.goto("/login?reason=idle")
  await expectAuthShell(page)
  // IdleBanner before the heading.
  const banner = page.getByRole("status").filter({
    hasText: /Signed out for inactivity/,
  })
  await expect(banner).toBeVisible()
  await expect(banner).toContainText(
    "You were signed out after 30 minutes of inactivity",
  )
  // Heading still renders below the banner.
  await expect(
    page.getByRole("heading", { name: "Welcome Back!" }),
  ).toBeVisible()
  await page.screenshot({
    path: shot("02-login-idle.png"),
    fullPage: true,
  })
})

test("/signup — Cormorant heading + Sign Up button + Sign In link", async ({
  page,
}) => {
  const errors = trackConsole(page)
  await page.goto("/signup")
  await expectAuthShell(page)
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible()
  await expect(page.getByLabel("Name")).toBeVisible()
  await expect(page.getByLabel("Email")).toBeVisible()
  await expect(page.getByLabel("Password").first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: /^Sign Up$/ }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: /^Sign In$/ }),
  ).toBeVisible()
  await page.screenshot({ path: shot("03-signup.png"), fullPage: true })
  expect(errors).toEqual([])
})

test("/forgot-password — chrome + heading", async ({ page }) => {
  const errors = trackConsole(page)
  await page.goto("/forgot-password")
  await expectAuthShell(page)
  await expect(
    page.getByRole("heading", { name: /Forgot your password\?/ }),
  ).toBeVisible()
  await expect(page.getByLabel("Email")).toBeVisible()
  await expect(
    page.getByRole("button", { name: /Send reset link/ }),
  ).toBeVisible()
  await expect(page.getByRole("link", { name: /^Sign In$/ })).toBeVisible()
  await page.screenshot({
    path: shot("04-forgot-password.png"),
    fullPage: true,
  })
  expect(errors).toEqual([])
})

test("/reset-password (no token) — Invalid reset link in Cormorant", async ({
  page,
}) => {
  await page.goto("/reset-password")
  await expectAuthShell(page)
  await expect(
    page.getByRole("heading", { name: "Invalid reset link" }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: /Request a new link/ }),
  ).toBeVisible()
  await page.screenshot({
    path: shot("05-reset-password-no-token.png"),
    fullPage: true,
  })
})

test("/verify-email (no token) — Couldn't verify in Cormorant", async ({
  page,
}) => {
  await page.goto("/verify-email")
  await expectAuthShell(page)
  await expect(
    page.getByRole("heading", { name: /Couldn.t verify/ }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: /Back to sign in/ }),
  ).toBeVisible()
  await page.screenshot({
    path: shot("06-verify-email-no-token.png"),
    fullPage: true,
  })
})

test("marketing-nav — by Nisarga via brand.parentName", async ({ page }) => {
  // T8 migrated the hardcoded literal. The visible string stays
  // identical; this test guards against accidental regression to the
  // literal in any subsequent edit.
  await page.goto("/")
  // Use first() because the marketing footer also says "AIRA by Nisarga"
  // — both should resolve through brand.parentName now.
  await expect(page.getByText(/by Nisarga/).first()).toBeVisible()
})
