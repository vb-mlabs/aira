# Plan: AIRA marketing landing page

**Date:** 2026-05-25
**Slug:** marketing-page-launch
**Status:** implemented
**Author:** Claude (with framer@millionlabs.co.uk as project lead)
**Reviewed:** [../reviews/2026-05-25-marketing-page-launch.md](../reviews/2026-05-25-marketing-page-launch.md) (UI-Significant: no)
**Implemented:** [../code/marketing-page-launch/report.md](../code/marketing-page-launch/report.md) (12 commits 4fdfb21..2e8b935)

---

## Problem

The current landing page at `apps/web/src/app/page.tsx` is the MLabs template default — generic SaaS structure pitching the *template's* features (`Hero` → `WhyMstack` → `ProductMock` → `LogoStrip` → `FeatureGrid` → `Testimonial` → `CtaBand`). A stranger landing on it cannot tell that AIRA exists, what it does, or who it's for.

AIRA's mobile app launches in ~15 weeks per [roadmap.md](../../roadmap.md). Until then, the marketing page is the **only** public surface of the brand. Its job is to:

1. Communicate what AIRA is (curated Atlanta Indian community directory) in one breath.
2. Capture email signups from interested end users (the chicken-and-egg unlock — we need an audience before businesses pay for listings).
3. Plant a low-friction conversion path for interested business owners (mailto, not a separate funnel).

**Success looks like:** the page is live on the production domain by end of Sprint 1, collects 100+ waitlist emails before MVP launches, and renders the locked AIRA design system correctly across desktop + mobile. The v4 mockup at `.mstack/mockups/marketing-page/v4/index.html` is the visual source of truth — see [FEEDBACK.md](../../.mstack/mockups/marketing-page/FEEDBACK.md) for the locked composition.

## Scope

**In:**

- New page composition: `Nav → Hero+WaitlistCard → About → Categories → Phone showcase → Business panel → Footer`.
- Five new components: `waitlist-card.tsx`, `about-editorial.tsx`, `categories-roster.tsx`, `phone-showcase.tsx`, `business-panel.tsx`.
- Rewrites in place: `marketing-nav.tsx`, `marketing-footer.tsx`, `hero.tsx`, `apps/web/src/app/page.tsx`.
- Retire seven obsolete components (see § Files to touch).
- New `waitlist` Drizzle schema + migration in `packages/db/`.
- New public POST `/api/v1/waitlist` route with honeypot anti-spam.
- New Postmark "Welcome to the AIRA waitlist" transactional template via the existing `@aira/email` `createTemplates` factory.
- New committed marketing imagery at `apps/web/public/marketing-images/`.
- `generateMetadata` with OG image, title, description, Twitter card.
- Forward-compatible `confirmed_at` field on waitlist (single-opt-in for MVP, double-opt-in possible later without migration).

**Out (deferred):**

- Pricing in the business panel (admin-configurable, finalized Sprint 4+).
- App Store / Google Play badges (false claim — app is not in stores).
- Real user testimonials (we have zero customers).
- Privacy / Terms page **content** (placeholder pages exist; refactor in a separate slice).
- Stripe, phone OTP, Twilio integration (Sprint 1.5 / Phase 2 per roadmap).
- Admin email notification when a new signup happens (nice-to-have).
- Double-opt-in confirm-via-email flow (forward-compat schema; flow itself deferred).
- IP-based rate limiting (defer unless abuse seen; honeypot is the MVP defense).
- "How it works" / FAQ / press sections.

## Approach

**Chosen: split the work into 3 staged PRs.** Same scope, three commits-worth of review surface, parallel-friendly:

1. **PR 1 — Backend (`feat(waitlist): schema + API route + welcome email`).** New Drizzle table, generated migration, public POST route, Postmark template + typed wrapper, validators, dev-preview wiring. Pure backend. Verifiable in isolation: `pnpm db:migrate` then `curl -X POST localhost:5000/api/v1/waitlist -d '{"email":"test@example.com"}' -H 'Content-Type: application/json'`. Email lands in inbox (or console driver). No UI change.
2. **PR 2 — Components (`feat(marketing): AIRA component tree`).** All five new components plus the three rewrites. The retired files stay in place at this point (so the existing landing page keeps rendering through this PR). Visually verifiable by mounting the components into a `/dev/marketing-preview` route or similar. WaitlistCard talks to the now-existing route.
3. **PR 3 — Wiring & cleanup (`feat(marketing): cut over to AIRA landing + retire MLabs components`).** Update `apps/web/src/app/page.tsx`, add `generateMetadata`, copy `marketing-images/` from `attached_assets/`, delete the seven retired files, sweep imports. This is the go-live moment; a single revert restores the prior MLabs landing.

Existing MLabs patterns this plan follows verbatim:

- **Route pattern** → mirror `apps/web/src/app/api/v1/notifications/unread-count/route.ts`. The waitlist route diverges only in being public (no `getSessionFromHeaders` gate) and POST instead of GET. Use `NextResponse.json` directly + `ApiError` from `@aira/api` for the 400 case. `defineOperation` is overkill for this single-field endpoint; route-direct is acceptable per ADR 0007's "service layer" exemption for simple I/O.
- **Schema pattern** → mirror `packages/db/src/schema/notifications.ts`. Same `text("id").primaryKey().$defaultFn(() => crypto.randomUUID())`, same `timestamp("created_at").defaultNow().notNull()`, same explicit index annotation style.
- **Email template pattern** → add a new typed wrapper to `packages/email/src/templates.tsx` mirroring `sendVerifyEmail`. New React Email component at `packages/email/src/templates/waitlist-welcome.tsx` mirroring `verify-email.tsx`. Subject lives in the wrapper.
- **Validator pattern** → `packages/validators/src/waitlist.ts` mirroring `packages/validators/src/auth.ts`. Pure Zod, exported from `packages/validators/src/index.ts`.
- **Brand tokens** → all references via CSS variables (`--background`, `--primary`, `--tier1/2/3`, `--brand-gold`, etc.) from `apps/web/src/app/globals.css`. No new tokens. The v4 mockup uses these verbatim — copying its styles is correct.
- **Brand strings** → `packages/config/src/brand.ts` for `brand.name`, `brand.tagline`, `brand.supportEmail`, `brand.legalEntity`. Marketing-copy literals ("Atlanta", "Roots & Reach", "Operated by Nisarga Group LLC") live inline in components — gated by the `no-brand-string-literal` ESLint allowlist (see § Open questions).

**Alternatives considered:**

- **Monolithic single-PR slice** — all 15 changes in one commit ledger. Rejected: too much to review in one go, harder to bisect if launch goes wrong, the backend/UI split is naturally parallelizable. The clean rollback story of a 3-PR split is worth the small overhead.
- **Ship landing v1.0 without waitlist capture, add capture in v1.1** — rejected. The whole point of the pre-launch page is to capture interest. Without the form, we'd be building a "Coming Soon" page, which the brief explicitly forbids ("Don't ship a 'Coming Soon' page with nothing actionable").
- **Use Better Auth's existing signup flow as the waitlist** — rejected. The signup flow (Sprint 1) creates a full `user` row with role, password hash, MFA, etc. Waitlist is a lighter primitive (email + timestamp) with different semantics (we don't want to send "verify your email to log in" emails — there's nothing to log into). A separate table is correct.
- **Use a 3rd-party email-capture service (ConvertKit, Loops, Mailchimp)** — rejected. Postmark is already wired; adding a vendor for one form is unnecessary infra. The `waitlist` table also gives us better admin search later for free.

## Data model changes

New table `waitlist` in `packages/db/src/schema/waitlist.ts`:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | text | primary key, `$defaultFn(() => crypto.randomUUID())` | Matches existing schema convention |
| `email` | text | not null, unique | Lowercased before insert |
| `created_at` | timestamp | default now(), not null | |
| `confirmed_at` | timestamp | nullable | Forward-compat for double opt-in; never set in MVP |
| `source` | text | not null, default `'marketing-hero'` | Future values: `'marketing-footer'`, `'business-mailto'`, etc. |

Indexes:

- `waitlist_email_idx` on `email` (unique constraint covers query plan, but explicit index documents intent for future admin search)
- `waitlist_created_idx` on `created_at desc` (admin "recent signups" view, deferred)

Migration: generated via `pnpm db:generate` (which writes to `packages/db/drizzle/migrations/`). The advisory-lock-safe `pnpm db:migrate` script handles concurrent deploys.

Add export to `packages/db/src/schema/index.ts`: `export { waitlist } from './waitlist'`.

## Files to touch

### New — frontend components

- `apps/web/src/components/marketing/waitlist-card.tsx` — boxed cream callout matching v4 `.hero-callout`. Client component (`"use client"`). State machine: idle → submitting → success | error. `useState` for email + status. Submit handler does `fetch('/api/v1/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, _h: '' }) })`. On 200: replace form with "Thanks — we'll be in touch." On 400: inline error. On 5xx: friendly retry copy.
- `apps/web/src/components/marketing/about-editorial.tsx` — server component, no state. 2-col grid, drop-cap on the first paragraph (CSS `.first-letter::first-letter`), muted right column.
- `apps/web/src/components/marketing/categories-roster.tsx` — server component. Categories as a typed `const` array in the file (since admin-managed categories don't ship until Sprint 2). Each row: roman numeral (`I.`–`VII.`) in italic gold serif, Cormorant category name with tier-color `border-bottom`, italic subcategory examples, static gold `›` arrow.
- `apps/web/src/components/marketing/phone-showcase.tsx` — server component. Two `next/image` `<Image>` of the home + listing screens from `apps/web/public/marketing-images/`. Tilted via CSS transform (`rotate(-7deg)` / `rotate(7deg)`). Copy on the right: eyebrow + Cormorant headline + 3-bullet list with serif primary-green chevrons.
- `apps/web/src/components/marketing/business-panel.tsx` — server component. Full-bleed olive bg with the green paper-texture variable. 2-col grid: copy + 4 checkmark perks + cream `mailto:hello@aira.app?subject=Listing%20AIRA` CTA on left; static listing-card preview on right.

### Edit — frontend components

- `apps/web/src/components/marketing/marketing-nav.tsx` — full rewrite. Sticky top (`position: sticky`), cream bg with `backdrop-filter: blur(10px)`. Left: tree-of-life logo + "AIRA / by Nisarga" wordmark. Right: single quiet "Get notified at launch" anchor link to `#notify` with brass-gold underline.
- `apps/web/src/components/marketing/marketing-footer.tsx` — full rewrite. 4-column grid: brand block (logo + name + tagline) / For users / For businesses / Legal. Bottom bar: `© <year> Nisarga Group LLC` + "Operated by Nisarga Group LLC ✦" signature. Pull `brand.name` and `brand.legalEntity` from `@aira/config`.
- `apps/web/src/components/marketing/hero.tsx` — full rewrite. Centered full-viewport (min-height calc minus nav). Tree-of-life logo at ~140px → Cormorant headline ("A directory of Atlanta's Indian community, *curated with care.*") → italic tagline → `<WaitlistCard />`. Bare minimum logic — most chrome is in `WaitlistCard`.
- `apps/web/src/app/page.tsx` — replace component imports + JSX tree. Add `generateMetadata` (see § New backend). Drop `getSession` call (no longer needed — no signed-in state to render for).

### Delete — frontend components

Audit imports first (`grep -r "from.*\(WhyMstack\|ProductMock\|LogoStrip\|FeatureGrid\|Testimonial\|CtaBand\|Tagline\)" apps/web/src/`), confirm no other route uses them, then:

- `apps/web/src/components/marketing/cta-band.tsx`
- `apps/web/src/components/marketing/feature-grid.tsx`
- `apps/web/src/components/marketing/logo-strip.tsx`
- `apps/web/src/components/marketing/product-mock.tsx`
- `apps/web/src/components/marketing/tagline.tsx` (also drop the import from old `hero.tsx` before delete)
- `apps/web/src/components/marketing/testimonial.tsx`
- `apps/web/src/components/marketing/why-mstack.tsx`

### New — assets (committed, not symlinked)

- `apps/web/public/marketing-images/logo.png` — copy from `attached_assets/logo_1779693398049.png`. Original is ~1024×1024; ship as-is, Next.js Image will optimize.
- `apps/web/public/marketing-images/home-screen.png` — copy from `attached_assets/Home_Screen_1779692546816.png`.
- `apps/web/public/marketing-images/business-listing.png` — copy from `attached_assets/BusinessListingScreen_1779692569944.png`.
- `apps/web/public/og-image.png` — 1200×630 social-share image. Composite of logo on cream bg + tagline. **If not designable in this slice**, ship with the logo on a 1200×630 cream pad as a temporary fallback and note in TODOS.md.

(`attached_assets/` itself remains untracked per current convention. The marketing page references files committed to `public/marketing-images/`, not symlinked paths.)

### New — backend

- `packages/db/src/schema/waitlist.ts` — table per § Data model.
- `packages/db/src/schema/index.ts` — add `export { waitlist } from './waitlist'`.
- `packages/db/drizzle/migrations/NNNN_waitlist.sql` — generated by `pnpm db:generate`. Reviewed by hand before commit.
- `packages/validators/src/waitlist.ts` — `WaitlistSignupSchema` = `z.object({ email: z.string().email().max(254).toLowerCase(), _h: z.string().max(0).optional() })`. Lowercase normalization prevents `Foo@bar.com` and `foo@bar.com` becoming separate rows.
- `packages/validators/src/index.ts` — `export * from './waitlist'`.
- `packages/email/src/templates/waitlist-welcome.tsx` — new React Email component mirroring `verify-email.tsx`. Uses `Layout` + `Button` primitives. Copy: "You're on the AIRA waitlist. We'll email you exactly once — the day AIRA opens in Atlanta. Until then, no spam, no resale. Thanks for being early."
- `packages/email/src/templates.tsx` — add `sendWaitlistWelcomeEmail` typed wrapper. Subject: `"You're on the AIRA waitlist — see you in Atlanta soon"`. Same render + driver pattern as the existing three wrappers.
- `packages/email/src/index.ts` — export the new component for the `/dev/emails` preview.
- `apps/web/src/app/dev/emails/page.tsx` — add the welcome template to the dev preview list.
- `apps/web/src/app/api/v1/waitlist/route.ts` — POST handler. `export const runtime = "nodejs"` (per existing convention). Validates body with `WaitlistSignupSchema`. If `_h` non-empty → return 200 silently (drop spam). Else: `db.insert(waitlist).values({ email }).onConflictDoNothing()`. If `rowsAffected > 0`, send welcome email (sync; failures are logged but do not error the response). Always return `NextResponse.json({ ok: true })`.

`generateMetadata` lives in `apps/web/src/app/page.tsx` (or `apps/web/src/config/seo.ts` if there's existing infrastructure — check on implementation). Title: `"AIRA — A directory of Atlanta's Indian community, curated with care"`. Description: `"AIRA is a hand-curated directory of trusted Indian-owned businesses across metro Atlanta. Operated by Nisarga Group LLC. Launching soon — get notified."`. OG: image at `/og-image.png` (absolute URL via `BETTER_AUTH_URL`), title, description. Twitter card: `summary_large_image`.

## Edge cases

- **Email already on waitlist** → `ON CONFLICT DO NOTHING` returns 0 rows; handler returns 200 `{ ok: true }`; **no second welcome email is sent**. No info-leak about prior signups.
- **Invalid email format** → Zod rejects → `ApiError.badRequest("Please enter a valid email address.")`.
- **Honeypot `_h` filled** → return 200 `{ ok: true }` silently. Do not insert, do not send. Logs the attempt at debug level so we can review if real users are tripping it.
- **Postmark down / token missing** → row is inserted (source of truth), email send fails, error logged via `apps/web/src/lib/logger`, response is still 200. The day AIRA actually launches we'll do a backfill mail-merge from the waitlist table if needed.
- **Concurrent inserts of same email** → unique constraint protects; same code path as the duplicate case.
- **Form submitted with JS disabled** → fallback: form `action="/api/v1/waitlist" method="POST"` so the request still hits the route. Response is JSON; in a no-JS browser the user sees `{"ok":true}` as raw text. Acceptable MVP edge — track if it surfaces in usage.
- **Production URL ≠ `aira.app` yet** → use `BETTER_AUTH_URL` env var (already validated at boot in `apps/web/src/config/env.ts`) as the canonical origin for absolute OG image URL. Replit's `*.replit.dev` URL works in the meantime.
- **`MarketingNav` sticky bg + `WaitlistCard` focus ring + `body` paper texture** interaction — verify by tabbing through fields on a real mobile device. iOS Safari's bottom-bar dance can cut into sticky nav layout.
- **2-col grids on small screens** — collapse to 1-col at `≤900px`. Already handled in v4 mockup CSS — replicate exactly. Verify in 375px Chrome DevTools.
- **`MarketingNav` link `#notify`** — hash anchor must resolve to the `<WaitlistCard id="notify">`. Smooth scroll is browser-default; no JS needed.
- **`marketing-images/` paths** must be root-relative (`/marketing-images/...`) so they work both in dev (port 5000) and prod (deployed Replit URL). No `process.env.NEXT_PUBLIC_*` rewrites needed.
- **Brand string ESLint rule** — see Open questions; this may force allowlist additions or `@aira/config` imports for some literals.

## Acceptance criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass on the branch
- [ ] `pnpm check-contrast` still all 36 pairs green (no token changes, should be a no-op)
- [ ] `pnpm gen:mobile-tw:check` passes (no mobile config drift)
- [ ] `pnpm db:generate` produces a single new migration file; `pnpm db:migrate` applies it cleanly to a fresh Neon branch
- [ ] `pnpm dev` then visit `http://localhost:5000/` → AIRA marketing page renders end-to-end; section order matches FEEDBACK.md
- [ ] Form submit with valid email → 200 → row appears in `waitlist` table (verify via `pnpm db:studio`) → welcome email arrives (Postmark inbox in dev, real inbox in prod)
- [ ] Same email submitted again → 200, no new row, no second email
- [ ] Empty / malformed email → 400 with inline error message
- [ ] Honeypot field filled (via curl) → 200, no row, no email, debug log line written
- [ ] Visit `/` on a 375px viewport → no horizontal scroll, all sections stack cleanly
- [ ] All 7 retired files deleted; `grep -r "WhyMstack\|ProductMock\|LogoStrip\|FeatureGrid\|Testimonial\|CtaBand" apps/web/src/` returns no matches
- [ ] View-source on `/` shows the new `<title>`, `<meta name="description">`, OG/Twitter cards
- [ ] `/dev/emails` preview renders the new waitlist welcome template at desktop + mobile widths
- [ ] Each of the 3 PRs is independently revertable without breaking the page

## Open questions

For `/mlabs-review` to resolve before implementation begins.

1. **PR split: 3 PRs as proposed, or single PR?** I recommend 3 (clean review surface, easy rollback, parallelizable). Reviewer's call if scope reads as too small to warrant the overhead.
2. **`no-brand-string-literal` allowlist:** Marketing copy needs literal "AIRA" / "Atlanta" / "Roots & Reach" / "Operated by Nisarga Group LLC" in many places. The rule file at `tooling/eslint-config/src/rules/no-brand-string-literal.mjs` shows it reads `brand.name` and matches it — but I did not confirm whether `apps/web/src/components/marketing/**` is in the allowlist. Two paths: **(a)** add the marketing dir to the allowlist (recommended — marketing prose is intrinsically brand-laden); **(b)** source every brand string via `@aira/config` (verbose and unnatural for prose copy). Pick one before implementation starts.
3. **`source` field values:** I proposed `'marketing-hero'` as the default. Other planned capture points should have their own values (`'marketing-footer'`, `'business-mailto'`, etc) — list any worth pre-defining.
4. **OG image asset:** 1200×630 social-share image. Designable now (logo on cream bg with tagline + brass-gold accent), or ship with logo-on-cream-pad fallback and revisit in a polish slice?
5. **Domain status:** `aira.app` (or chosen production domain) registered yet? Postmark sender signature needs the domain verified + DKIM/SPF records. If not, **this is a Sprint 0 blocker that gates email delivery** — flag in roadmap and FORK_CHECKLIST.
6. **Honeypot field name:** I proposed `_h`. Some spam bots target obviously-named fields (`name`, `username`) but not underscore-prefixed weirdness. Recommended path: ship `_h`, watch logs, switch if needed. Reviewer can override if they have a strong opinion.
7. **Sync vs queued welcome email:** Sync in the POST handler for MVP. Per `roadmap.md` cron strategy, future scaling could move this to a `node-cron` background processor. Confirm sync is acceptable for the launch volume.
8. **Where does `generateMetadata` live?** `apps/web/src/app/page.tsx` directly, or extend the existing `apps/web/src/config/seo.ts` (referenced from the current `layout.tsx`)? The latter is cleaner if `seo.ts` already has the right shape.
9. **`apps/web/src/components/marketing/hero.tsx` rewrites import `Tagline`** today. If we delete `tagline.tsx` in this slice, make sure no other route still uses it (`grep -r "from.*tagline" apps/web/src/`). If something does, refactor consumers first or postpone the delete.
10. **Should retired components be moved to a `_archive/` folder rather than deleted?** Some teams prefer to keep removed components around for reference. Recommend straight delete (git history is the archive); reviewer call.
