# QA report — 2026-05-25 11:20

**Focus:** marketing-page-launch (commits 4fdfb21..2e8b935)
**Env:** localhost:5000 via Replit tunnel
**Status:** ✅ **clean** (all 3 real defects fixed and re-verified)
**Tester:** /mlabs-qa
**Run closed:** 2026-05-25 11:36 — fix commits `de6e297`, `122e9f4`, `57c1599`
**Spec:** [.mstack/qa/2026-05-25-1120/specs/run-qa.mjs](./specs/run-qa.mjs)
**Raw results:** [results.json](./results.json)

---

## Scenarios run

1. ✅ **Desktop render** (1280×800) — `/` loads, all 5 sections present, footer signature present, no 404s, no console errors
2. ✅ **Form happy path** (desktop) — valid email submits, success state appears, no console errors
3. ✅ **Form invalid email** (desktop) — `a@b` (HTML5-valid, Zod-invalid) gets 400 from server, `role="alert"` element appears
4. ✅ **Tab order** — focus jumps email-input → submit button; honeypot is NOT reachable via keyboard
5. ⚠ **Mobile iPhone 14 Pro** (393×852) — renders without horizontal scroll, but heading font wrong (see Issue 1)
6. ⚠ **Mobile Pixel 7** (412×915) — same as iPhone
7. ✅ **Cross-route** — `/privacy`, `/terms`, `/dev/emails` all render with the new nav/footer; waitlist welcome appears in `/dev/emails`

Curl pre-checks: ✅ all routes 200 · ✅ OG/Twitter meta tags present · ✅ marketing-images/* served

## Issues

### Issue 1: Hero + all section headings render in Lato instead of Cormorant Garamond

- **Severity:** HIGH (visible everywhere; defeats the brand voice the design system is built around)
- **Repro:**
  1. Visit `https://9530c32d-...replit.dev/`
  2. Inspect the `<h1>` "A directory of Atlanta's Indian community"
  3. Computed `font-family` = `Lato, "Lato Fallback", system-ui, sans-serif`
- **Expected:** Cormorant Garamond (the brand's display serif)
- **Actual:** Lato (the body sans) — every heading on every section
- **Screenshots:**
  - `assets/01-desktop-home-top.png` — hero in sans, not serif
  - `assets/02-desktop-home-bottom.png` — category names + footer wordmark all sans
  - `assets/05-form-success.png` — "Thanks — you're on the list" in sans
  - `assets/11-mobile-iphone-home-full.png` — mobile shows the same
- **Console errors:** none
- **Suspected cause:** Tailwind v4 only generates `font-<name>` utilities for `--font-<name>` vars in `@theme inline`. My components use `className="font-display"` but `globals.css` declares `--font-heading`, not `--font-display`. So `font-display` is a silent no-op className and Tailwind falls back to inherited `font-sans` (which is Lato).
- **Fix plan:** Add one line to `apps/web/src/app/globals.css` in the `@theme inline` block, alongside `--font-sans`/`--font-mono`/`--font-heading`:
  ```css
  --font-display: var(--font-cormorant-garamond), Georgia, serif;
  ```
  This makes `font-display` a registered utility that resolves to Cormorant. No component changes needed; the bug fixes globally with one edit.
  
  *Alternative:* sweep all `font-display` to `font-heading` in 6 component files. More files touched, same result. Recommend the one-line alias.
- **Permanent test suggestion:** Add a vitest/Playwright assertion that computes `getComputedStyle(<h1>).fontFamily` on the live page and matches `/cormorant/i`. Would catch any future utility-name drift.
- **Status:** ✅ fixed (commit `de6e297`) — re-verified: hero font now contains "cormorant"

### Issue 2: Next.js Image aspect-ratio warnings + missing `priority` on LCP image

- **Severity:** LOW (no user-visible bug; console-only; minor perf miss)
- **Repro:**
  1. Visit `/` in Chrome dev tools console
  2. See 3 warnings about `/marketing-images/home-screen.png` and `/marketing-images/business-listing.png`:
     - "Image with src ... has either width or height modified, but not the other..."
     - "Image was detected as the LCP. Please add the `loading=\"eager\"` property..."
- **Expected:** Zero warnings; LCP image opted into eager loading.
- **Actual:** Three Next.js dev-only warnings.
- **Console errors:** captured in `results.json`
- **Suspected cause:** `phone-showcase.tsx` `<Image>` has `width={260} height={563}` but CSS applies `h-auto w-full`, so Next.js can't verify aspect ratio. Also missing `priority` on the first (above-the-fold) phone.
- **Fix plan:** In `apps/web/src/components/marketing/phone-showcase.tsx`:
  - Add `priority` prop to the first `PhoneFrame` (the left one — Home screen is the LCP).
  - Add `style={{ width: "100%", height: "auto" }}` to the `<Image>` to silence the aspect-ratio warning, OR drop the explicit `w-full` Tailwind class and let the intrinsic dimensions handle it.
- **Status:** open

### Issue 3: Inline form error is too small to notice

- **Severity:** NIT (works functionally; just easy to miss)
- **Repro:**
  1. Visit `/`, scroll to waitlist form
  2. Enter `a@b`, click "Notify me"
  3. Inline error `<p role="alert" class="mt-3 text-xs text-destructive">` appears below the form
- **Expected:** User can see WHY their email was rejected.
- **Actual:** The message renders at `text-xs` (12px) in destructive red — present in DOM (assistive tech announces it), but visually nearly invisible to a sighted user. See `assets/06-form-invalid-error.png` — the inline error is so small you don't notice it.
- **Suspected cause:** I styled the inline error too quietly when writing T5. Form's "fine print" disclaimer is also `text-xs`, so the error doesn't visually distinguish itself.
- **Fix plan (applied):** Bumped to `text-sm font-semibold`, added `⚠` prefix, wrapped in `inline-flex` pill with soft destructive-10% background tint + `rounded-lg`.
- **Status:** ✅ fixed (commit `57c1599`) — re-verified: 06-form-invalid-error.png now clearly shows the warning pill

### Issue 4 (INFO, not a bug): OG image absolute URL points to airabynisarga.com

- **Severity:** INFO
- **Repro:**
  - View-source on `/` → `<meta property="og:image" content="https://airabynisarga.com/og-image.png">`
- **Why this is correct:** `seo.ts` uses `brand.url` (`https://airabynisarga.com`) as the metadata base. Next.js resolves the relative `/og-image.png` against that base to produce the absolute URL Twitter/LinkedIn scrapers need.
- **Caveat:** Today, scrapers will fail (`airabynisarga.com` doesn't resolve yet — Sprint 0 follow-up per `roadmap.md`). The og:image will work the moment DNS goes live. No fix needed at this layer.
- **Status:** documented, no action

### Issue 5 (INFO, dev-only): Next.js dev mode indicator overlaps content

- **Severity:** INFO
- **Repro:**
  - Visit `/` on mobile viewport (≤412px)
  - The Next.js `N` dev indicator (bottom-left) overlaps the "Multi-category listing" perk checkmark in the business panel
- **Why this is fine:** Dev-only affordance. `next build` removes it.
- **Status:** documented, no action

---

## Summary

**5 findings · 1 high · 1 low · 1 nit · 2 info-only**

- **Real defects:** 3 — all ✅ fixed and re-verified
- **Info-only:** 2 — documented, no action needed

Final QA spec run reports **0 findings**. Full verification sweep passed:
`pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` (162 tests) ✅ · `pnpm check-contrast` ✅

## Fix commits

| Issue | Commit | Re-verify result |
|---|---|---|
| 1 (HIGH — Cormorant) | `de6e297` | Hero `<h1>` font-family now matches `/cormorant/i` |
| 2 (LOW — Image warnings) | `122e9f4` | Zero console warnings on `/` |
| 3 (NIT — error prominence) | `57c1599` | Inline pill renders visibly with ⚠ + bg tint |

## Permanent test suggestions (for a future PR, not this run)

- **Assert hero typeface.** Playwright spec under `apps/web/e2e/` that loads `/` and checks `getComputedStyle(document.querySelector("h1")).fontFamily` matches `/cormorant/i`. Catches utility-name drift.
- **Assert honeypot un-tabbable.** Playwright spec that focuses the email input, tabs once, and asserts `document.activeElement.getAttribute("aria-hidden") !== "true"`. The current run validated this once; locking it in as a regression test is cheap.
