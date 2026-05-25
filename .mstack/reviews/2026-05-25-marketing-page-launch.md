# Review: AIRA marketing landing page

**Date:** 2026-05-25
**Slug:** marketing-page-launch
**Plan reviewed:** [2026-05-25-marketing-page-launch.md](../plans/2026-05-25-marketing-page-launch.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (with framer@millionlabs.co.uk as project lead)

---

## Summary

Plan is ready to implement, with three pivots locked during review:

1. **`defineOperation` cannot be used for the waitlist route.** Reading `packages/api/src/operation.ts:218-219` confirms `runFromRequest` always 401s when `getSession` returns null, and the `Permission` type is `"user" | "admin"` only — there is no `"public"` enum value. The plan's route-direct approach is therefore correct *by necessity*, not as a stylistic deviation. Documented as the same flavor of exception as `notifications/unread-count/route.ts` (different reason — that one's HTTP-caching exempt, ours is no-auth).
2. **`tooling/eslint-config/src/rules/no-brand-string-literal.mjs` does NOT allowlist `components/marketing/`.** Confirmed by reading lines 46-55 — the ALLOW_PATTERNS list covers `config/`, `templates/`, `legal/`, `translations/`, `docs/`, `e2e/`, `tests/`, `node_modules/` only. The marketing prose ("AIRA", "Roots & Reach", "Atlanta", "Operated by Nisarga Group LLC") would trigger the rule. User decision: add the marketing dir to ALLOW_PATTERNS as a one-line tooling change (Task 9).
3. **Production domain = `airabynisarga.com`** (not the `aira.app` placeholder in `brand.ts`). User confirmed during review. Triggers a `brand.ts` edit, which is normally a "Pause if" trigger per `AGENTS.md` — pre-approved here. Postmark sender signature for the domain is assumed NOT yet verified, so the welcome email gracefully falls back to the console driver (existing `@aira/email` behavior when `postmarkToken` or `fromEmail` is missing). Real sender verification is a Sprint 0 follow-up.

Other open questions resolved unilaterally — see § Decisions locked. UI-Significant flag = **no** per the heuristic (page.tsx counts but `components/marketing/**` is explicitly excluded; only 1 file matches and it's not a new page).

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan proposes route-direct for the public POST without acknowledging that `defineOperation` is also auth-only by design.
  **Decision:** Route-direct is the only option today. Lock as documented exception; add inline comment in the route mirroring the `notifications/unread-count` exception comment. Note in `docs/decisions/0007-service-layer.md` (or follow-up ADR) if we want to grow `defineOperation` to support `permission: "public"` later — out of scope for this slice.

- **Concern:** Plan's 3-PR split has PR 2 introduce 5 new components that aren't wired into `page.tsx` yet (still using old MLabs tree). That's dead code in production briefly.
  **Decision:** Acceptable. The dead-code window is < 1 PR. The benefit (clean rollback story, parallel review surface, the additive-then-cutover pattern that keeps the live page rendering through the migration) outweighs the cost. Documented as a learning to apply to future template-surface swaps.

- **Concern:** Plan deletes 7 components in the cutover PR. `tagline.tsx` is currently imported by the existing `hero.tsx`. If the delete commit lands before the hero rewrite commit within the cutover PR, the build breaks.
  **Decision:** Task ordering enforces it: T11 (cutover: rewrite hero + page.tsx + add og-image) runs BEFORE T12 (delete retired files). T11 stops importing `tagline.tsx`; T12 then safely removes it.

- **Concern:** `brand.ts` placeholder values (`supportEmail: "support@aira.app"`, `socialHandle: "@aira_atl"`, `url: "https://aira.app"`) need swapping to the real domain. Editing `brand.ts` is normally a Pause-if trigger per `AGENTS.md`.
  **Decision:** Pre-approved here. The values are placeholders by definition — replacing them with the real domain is exactly what the plan demands. Bundle with the eslint allowlist change in Task 9 since both are "rebrand-layer" tooling-adjacent.

- **Concern:** ~1 MB of committed image assets in `apps/web/public/marketing-images/`.
  **Decision:** Acceptable for Replit deployment. Total `attached_assets/` is 2.4 MB; we're only committing 3 of the 7 (logo + Home_Screen + BusinessListingScreen) = ~960 KB. Next.js will optimize on serve. No CDN needed.

- **Concern:** `seo.ts` already provides `generateMetadata` with a default OG image at `/og-default.png`. Plan proposes a new asset at `/og-image.png`.
  **Decision:** Don't change `seo.ts`'s default — keep it untouched (other routes may rely on it). The marketing page calls `generateMetadata({ openGraph: { images: [{ url: "/og-image.png" }] } })` to override. Asset name stays `og-image.png` to make its purpose clear ("the marketing page's OG image" vs the helper's `og-default`).

### Suggestions (taken or deferred)

- **Suggestion:** Reuse `emailSchema` from `packages/validators/src/auth.ts` rather than redeclaring `z.email()` in `waitlist.ts`. Same shape, one source of truth.
  **Status:** Taken — incorporated into Task 2.

- **Suggestion:** Add `source` as a Zod enum (`'marketing-hero' | 'marketing-footer' | 'business-mailto'`) rather than free-text. Makes future analytics queries cleaner.
  **Status:** Taken — Task 1 schema uses a check constraint, Task 2 validator uses `z.enum([...])`.

- **Suggestion:** Pre-create `apps/web/src/app/dev/marketing-preview/page.tsx` so the new components can be eyeballed in dev before the cutover PR.
  **Status:** Deferred — adds scope without much gain. Components are server-renderable; the cutover PR is the natural moment to see them composed. Track if the cutover commit blows up unexpectedly.

- **Suggestion:** Add a `WaitlistAdmin` view at `/admin/waitlist` listing recent signups.
  **Status:** Deferred to a separate slice. Admin tooling for waitlist is post-launch nice-to-have, not pre-launch blocker.

## Decisions locked

Net new decisions made during review (beyond what the plan covered):

1. **`source` field is a typed enum**, not free text: initial valid values `'marketing-hero' | 'marketing-footer' | 'business-mailto'`. Adds a check constraint at the DB level + Zod enum at the validator. Easier to add values later than to retrofit a discriminator on free text.
2. **Welcome email graceful degradation** — if Postmark token / sender email isn't configured (real case until airabynisarga.com is verified), `@aira/email`'s existing console driver fallback handles it. No new code; the row still inserts. Document inline in the route.
3. **`brand.ts` placeholder swap is pre-approved** (Task 9). Normally Pause-if; here the swap is the literal purpose of the slice. No mid-task escalation needed.
4. **`apps/web/src/config/seo.ts` is the source of truth** for `generateMetadata`. Don't extend the helper. Override `title` / `description` / `openGraph.images` from the marketing page only.
5. **OG asset is logo-on-cream pad** (1200×630). Composed during Task 11 — Sharp is already in the stack (used by `apps/web/src/features/avatar/server/pipeline.ts`). If Sharp turns out too heavy for build-time, fall back to a hand-authored PNG via a quick design pass; either way, ship something.
6. **`_h` honeypot field name** locked. Watch logs post-launch; switch to a more bot-targeted name (`name`, `username`) only if abuse appears.

## UI-Significant: no

Per the heuristic in `mlabs-review` skill:

- Files touched matching the criteria: `apps/web/src/app/page.tsx` (modified, not new).
- `components/marketing/**` is explicitly excluded from the heuristic.
- No new routes, no `layout.tsx` changes, no `features/*/components/` changes.
- Count = 1; not ≥3, and not a new `page.tsx`.

Result: **no**. Routes straight to `/mlabs-code` after this review (no `/mlabs-mockup` detour — design is already locked at `.mstack/mockups/marketing-page/v4/`).

---

## Implementation plan

12 atomic commits across 3 logical PRs. PR boundaries are deploy units; within a PR, each task is one commit and `/mlabs-code` runs autonomously through them unless a `Pause if` triggers.

### PR 1 — Backend (4 commits)

#### Task 1: Add `waitlist` Drizzle schema + migration

- **Files:** `packages/db/src/schema/waitlist.ts` (new) · `packages/db/src/schema/index.ts` (edit) · `packages/db/drizzle/migrations/NNNN_waitlist.sql` (new, generated)
- **What:** New table `waitlist` with `id` (text PK, `$defaultFn(crypto.randomUUID)`), `email` (text not null unique), `created_at` (timestamp default now), `confirmed_at` (timestamp nullable), `source` (text not null default `'marketing-hero'`, CHECK constraint allowing `marketing-hero | marketing-footer | business-mailto`). Indexes: `waitlist_email_idx` (unique covers, but explicit for future admin search), `waitlist_created_idx` (desc, for admin recency view). Style mirrors `packages/db/src/schema/notifications.ts` verbatim. Export via `export * from "./waitlist"` in `schema/index.ts` (matches existing pattern).
- **Acceptance:** `pnpm db:generate` produces a single migration file referencing the new table. `pnpm db:migrate` applies cleanly to a fresh Neon branch. Migration includes the CHECK constraint on `source`.
- **Pause if:** `pnpm db:generate` produces more than one migration file (means the schema accidentally affects other tables).

#### Task 2: Add waitlist validator

- **Files:** `packages/validators/src/waitlist.ts` (new) · `packages/validators/src/index.ts` (edit)
- **What:** `WaitlistSignupSchema = z.object({ email: emailSchema, source: z.enum([...]).default("marketing-hero"), _h: z.string().max(0).optional() })`. Reuses the shared `emailSchema` from `packages/validators/src/auth.ts`. Export via `export * from "./waitlist"` in `validators/src/index.ts`. Type alias `WaitlistSignupInput = z.infer<typeof WaitlistSignupSchema>`.
- **Acceptance:** `pnpm typecheck` passes. Unit test (or quick repl): `WaitlistSignupSchema.parse({email: "a@b.com"})` succeeds with `source: "marketing-hero"` defaulted; `parse({email: "bad"})` throws; `parse({email: "a@b.com", _h: "x"})` throws (max 0 chars).

#### Task 3: Add welcome email template + wrapper + dev preview

- **Files:** `packages/email/src/templates/waitlist-welcome.tsx` (new) · `packages/email/src/templates.tsx` (edit) · `packages/email/src/index.ts` (edit) · `apps/web/src/app/dev/emails/page.tsx` (edit)
- **What:** New React Email component `WaitlistWelcomeEmail` mirroring `VerifyEmail` shape (same `Layout` + `Button` primitives, same `brand.emailColors` hex fallbacks for Gmail-safe rendering). Copy: subject `"You're on the AIRA waitlist — see you in Atlanta soon"`, body explains the single-email promise ("We'll email you exactly once: the day AIRA opens in Atlanta") + Nisarga signature. Add `sendWaitlistWelcomeEmail` typed wrapper to `createTemplates` (mirrors the existing 3 wrappers). Export the new component from `index.ts` for `/dev/emails` preview. Add an entry to the dev preview page so it renders alongside the other templates.
- **Acceptance:** `pnpm dev` then visit `http://localhost:5000/dev/emails` → new template renders at both desktop + mobile widths. `pnpm typecheck` passes (the new wrapper is typed via `EmailTemplates` interface).
- **Pause if:** Postmark template metadata needs a unique template ID we don't have provisioned (we use raw HTML send, not Postmark templates, so this shouldn't apply — verify quickly).

#### Task 4: Add `/api/v1/waitlist` POST route

- **Files:** `apps/web/src/app/api/v1/waitlist/route.ts` (new) · `apps/web/src/lib/email/index.ts` or similar (edit — verify where the email client is composed) · `docs/api-versioning.md` (edit — add the new route to the routes table)
- **What:** Route-direct handler (`defineOperation` doesn't support public routes; documented exception with inline comment referencing this review). `export const runtime = "nodejs"`. Parse JSON body with `WaitlistSignupSchema`. Honeypot check (if `_h` is non-empty, return 200 silently). Lowercase email server-side (validator already does this via `z.string().email().toLowerCase()` — verify). Insert via `db.insert(waitlist).values({...}).onConflictDoNothing()`. If `rowsAffected > 0`, call `email.sendWaitlistWelcomeEmail({to, brandName})`; catch and log any send failure but still return 200. Always return `NextResponse.json({ ok: true })`. Update `docs/api-versioning.md` routes table with new row: `POST /api/v1/waitlist | public | route-direct | Honeypot anti-spam, sync welcome email`.
- **Acceptance:** `curl -X POST http://localhost:5000/api/v1/waitlist -H 'Content-Type: application/json' -d '{"email":"test@example.com"}'` returns `{"ok":true}` with 200. Row appears in `waitlist` via `pnpm db:studio`. Welcome email lands in console (or Postmark inbox once domain configured). Same call again → 200, no new row, no second email. `{"email":"bad"}` → 400 with error message. `{"email":"a@b.com","_h":"spam"}` → 200, no row, no email, log line at debug level.
- **Pause if:** The existing email client composition lives somewhere other than expected — `notifications/mark-all-read` doesn't send email, so there's no exact precedent for "POST route that sends an email." Look for the pattern in `apps/web/src/server/operations/` or Better Auth's signup callback.

---

### PR 2 — Additive new components + tooling (5 commits)

These are all additive — no existing files are edited until Task 10 in the next PR. The live marketing page keeps rendering through this PR unchanged.

#### Task 5: Add `waitlist-card.tsx`

- **Files:** `apps/web/src/components/marketing/waitlist-card.tsx` (new)
- **What:** Client component (`"use client"`). State machine: `idle | submitting | success | error`. `useState` for email + status. Submit handler `POST /api/v1/waitlist` (from Task 4) with `{ email, source: "marketing-hero", _h: "" }`. Honeypot field rendered with `aria-hidden + tabIndex={-1} + position: absolute + left: -9999px` so humans don't see it. Visual matches v4 mockup `.hero-callout` exactly: boxed cream card, brass-gold border, Cormorant subhead `"Be among the first 100 neighbors to know"`, fine print `"No spam, no resale. Operated by Nisarga Group LLC."`. Accepts a `source` prop with default `"marketing-hero"` so the same component can be reused in `business-panel` or footer later.
- **Acceptance:** Compiles + typecheckes. Can be mounted in a dev/preview route (manual eyeball). Honeypot field exists in DOM but is visually hidden. Submit with valid email → component swaps to success state with "Thanks — we'll be in touch." Submit with invalid email → inline error message. Network 5xx → friendly retry copy.

#### Task 6: Add `about-editorial.tsx` + `categories-roster.tsx`

- **Files:** `apps/web/src/components/marketing/about-editorial.tsx` (new) · `apps/web/src/components/marketing/categories-roster.tsx` (new)
- **What:** Both server components, no state, no client boundary needed. `AboutEditorial` = 2-col grid with CSS `:first-letter` drop-cap on the lead paragraph, muted right column with two grounding paragraphs. Copy verbatim from v4 mockup. `CategoriesRoster` = 7-row numbered list. Categories declared as a typed `const categories = [{numeral, name, examples, tier}, ...]` inside the file (admin-managed categories don't ship until Sprint 2; this is hardcoded marketing copy). Each row uses tier-color `border-bottom` on the category name (`var(--tier1/2/3)`), italic Cormorant subcategory examples, static gold `›` arrow. No hover state (matches v4 final iteration).
- **Acceptance:** Compiles + typecheckes. Manual eyeball confirms visual match to v4 mockup at desktop + 375px viewport.

#### Task 7: Add `phone-showcase.tsx` + copy marketing images

- **Files:** `apps/web/src/components/marketing/phone-showcase.tsx` (new) · `apps/web/public/marketing-images/logo.png` (new, copied from `attached_assets/logo_1779693398049.png`) · `apps/web/public/marketing-images/home-screen.png` (new, copied from `attached_assets/Home_Screen_1779692546816.png`) · `apps/web/public/marketing-images/business-listing.png` (new, copied from `attached_assets/BusinessListingScreen_1779692569944.png`)
- **What:** Server component. Two `<Image>` from `next/image` (Home screen + Business listing screen). Tilted via CSS transforms `rotate(-7deg)` / `rotate(7deg)`. Copy on the right: eyebrow "The app", Cormorant headline "Built for the way you *actually* look for things", 3-bullet list with serif primary-green chevrons. Use `next/image`'s built-in optimization; sizes attribute `(max-width: 900px) 190px, 260px`.
- **Acceptance:** Compiles + typecheckes. Images load via Next.js `_next/image` optimizer. Mobile (≤900px) collapses to single-column with smaller tilted phones per v4 mockup.

#### Task 8: Add `business-panel.tsx`

- **Files:** `apps/web/src/components/marketing/business-panel.tsx` (new)
- **What:** Server component. Full-bleed section with `bg oklch(0.42 0.06 130)` + `background-image: var(--texture-paper-green)` from globals.css. 2-col grid: left has copy + 4 checkmark perks (Verified badge, Sponsored placement, Multi-category listing, Broadcast) + cream `mailto:hello@airabynisarga.com?subject=Listing%20AIRA` CTA button. Right has a static listing-card preview matching the v4 mockup pattern (logo placeholder, business name, verified blue tick, rating, social icons row, "More info" tier-orange pill). Caption below: italic Cormorant "A listing on AIRA — verified tick, quick actions, sponsored placement."
- **Acceptance:** Compiles + typecheckes. Manual eyeball matches v4. mailto link uses the real domain.

#### Task 9: Tooling + brand identity swap

- **Files:** `tooling/eslint-config/src/rules/no-brand-string-literal.mjs` (edit — add one line) · `packages/config/src/brand.ts` (edit — placeholder swap)
- **What:** Two related tooling-layer changes bundled in one commit.
  1. In `no-brand-string-literal.mjs`, add `/[\\/]components[\\/]marketing[\\/]/` to `ALLOW_PATTERNS` (line ~46-55). Add an inline comment noting the rationale (marketing prose is intrinsically brand-laden; the rule exists to prevent accidental brand-string leakage in *app* code, not to wrap every word of marketing copy).
  2. In `brand.ts`, swap placeholder values: `supportEmail: "support@airabynisarga.com"`, `socialHandle: "@airabynisarga"` (or whatever the user prefers — placeholder this if uncertain), `url: "https://airabynisarga.com"`. **Do NOT change `brand.name`, `brand.tagline`, `brand.taglineHighlight`, `brand.legalEntity`, or `brand.emailColors`** — those are correct.
- **Acceptance:** `pnpm lint` still passes across all packages (no regression — the allowlist only widens, never narrows). `pnpm typecheck` passes. A grep `grep -r "aira.app" packages/ apps/ docs/` returns no matches (verifies the swap was complete). The `no-brand-string-literal` rule lets a test fixture in `apps/web/src/components/marketing/_test-fixture.tsx` (delete after) with literal "AIRA" pass lint — alternatively just trust the unit tests of the rule itself.
- **Pause if:**
  - Lint regression in any package after the allowlist change. The rule is widening, but if some other rule depends on the literal "AIRA" being flagged in a marketing file, surface it.
  - `brand.url` swap affects anything beyond seo.ts default — the `url` value is also used in email footer links via `brand` import; verify those still resolve.
  - Any test in `packages/email/tests/` or `apps/web/tests/` asserts against the old "aira.app" string.

---

### PR 3 — Cutover + cleanup (3 commits)

#### Task 10: Rewrite `marketing-nav.tsx` + `marketing-footer.tsx` in place

- **Files:** `apps/web/src/components/marketing/marketing-nav.tsx` (edit) · `apps/web/src/components/marketing/marketing-footer.tsx` (edit)
- **What:** Full rewrites. Visual match to v4 mockup. Nav: sticky top, cream bg with `backdrop-filter: blur(10px)`, logo + "AIRA / by Nisarga" wordmark left, quiet "Get notified at launch" anchor link (with brass-gold underline) right. Footer: 4-column grid (brand block / For users / For businesses / Legal), bottom bar with `© <year> Nisarga Group LLC` + "Operated by Nisarga Group LLC ✦" signature. Pull `brand.name` and `brand.legalEntity` from `@aira/config`; marketing prose is allowed inline now per Task 9's allowlist change. Drop the `signedIn` prop from `MarketingNav` — the new marketing page is fully unauthenticated.
- **Acceptance:** `pnpm dev` then `localhost:5000/` → old page.tsx still renders (because we haven't cut over yet), but nav + footer are now AIRA-branded. The middle of the page (WhyMstack / ProductMock / etc) looks mismatched. That's expected — Task 11 fixes it.

#### Task 11: Cutover — rewrite `hero.tsx` + `page.tsx` + add og-image

- **Files:** `apps/web/src/components/marketing/hero.tsx` (edit) · `apps/web/src/app/page.tsx` (edit) · `apps/web/public/og-image.png` (new) · `apps/web/src/config/seo.ts` (no change — verify only)
- **What:** The go-live commit. Multiple files, but logically atomic (any subset leaves the page broken).
  1. Rewrite `hero.tsx` per v4: centered editorial composition, tree-of-life logo at ~140px from `/marketing-images/logo.png`, Cormorant headline `"A directory of Atlanta's Indian community, *curated with care.*"`, italic tagline `"Roots & *Reach*"` (REACH in brass-gold via styled span), embedded `<WaitlistCard />`. Drop the `<Tagline />` import.
  2. Rewrite `apps/web/src/app/page.tsx` to import the new tree: `MarketingNav` → `Hero` → `AboutEditorial` → `CategoriesRoster` → `PhoneShowcase` → `BusinessPanel` → `MarketingFooter`. Remove the `getSession()` call (no longer needed — the new MarketingNav doesn't take `signedIn`). Add `export const metadata` calling `generateMetadata({ title: "AIRA — A directory of Atlanta's Indian community, curated with care", description: "AIRA is a hand-curated directory of trusted Indian-owned businesses across metro Atlanta. Operated by Nisarga Group LLC. Launching soon — get notified.", openGraph: { images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "AIRA — Atlanta's Indian community directory" }] }, twitter: { images: ["/og-image.png"] } })` from `@/config/seo`.
  3. Add `og-image.png` (1200×630) — logo on cream pad with tagline. Compose via Sharp at build-time (`scripts/build-og-image.ts` may be needed) OR hand-author a static PNG. Either works for v1.
- **Acceptance:** `pnpm dev` → `localhost:5000/` renders the full AIRA marketing page top-to-bottom matching `v4/index.html`. View-source shows new `<title>`, `<meta name="description">`, OG/Twitter cards. `localhost:5000/og-image.png` returns the 1200×630 PNG (Content-Type: image/png). Form in hero submits to `/api/v1/waitlist`, row appears in DB, welcome email lands.
- **Pause if:**
  - `generateMetadata` from `@/config/seo` doesn't accept the override shape needed (the helper is `(overrides: Partial<Metadata>) => Metadata`; verify `openGraph` nested overrides work as expected).
  - Sharp build-time composition fails on Replit (binary deps); fall back to a hand-authored PNG and document.
  - Image asset paths break in production deploy (the `apps/web/.next/standalone` copy step in `.replit` `[deployment].build` runs — verify `marketing-images/` and `og-image.png` survive).

#### Task 12: Delete retired components

- **Files (delete):** `apps/web/src/components/marketing/cta-band.tsx` · `feature-grid.tsx` · `logo-strip.tsx` · `product-mock.tsx` · `tagline.tsx` · `testimonial.tsx` · `why-mstack.tsx`
- **What:** Pre-delete audit: `grep -r "from.*\(cta-band\|feature-grid\|logo-strip\|product-mock\|tagline\|testimonial\|why-mstack\)" apps/ packages/ --include="*.tsx" --include="*.ts"` must return zero matches (the only consumer is `page.tsx`, which Task 11 already updated). If any other consumer exists, refactor or fail this task. Then `git rm` the 7 files.
- **Acceptance:** `pnpm typecheck && pnpm lint && pnpm test` pass. `pnpm build` succeeds. Pre-commit hooks (check-migrations, check-contrast, check-mobile-tailwind) all green. `grep -r "WhyMstack\|ProductMock\|LogoStrip\|FeatureGrid\|Testimonial\|CtaBand\|Tagline" apps/web/src/` returns zero matches.
- **Pause if:** The grep finds a consumer outside `page.tsx`. Could mean someone added a usage between Task 11 and here, or there's a path the plan missed.

---

## Open questions

For `/mlabs-code` to escalate if reality diverges from the plan.

1. **OG image composition:** Sharp build-time vs hand-authored static PNG. Plan says "either works for v1." If Sharp is over-budget in Task 11, ship a hand-authored PNG and add a TODO to compose dynamically once the brand has a designer attached.
2. **`brand.socialHandle` value:** Plan proposes `"@airabynisarga"`. User confirmed the domain but didn't specify a social handle. If the AIRA team has actual Twitter / Instagram / LinkedIn handles, use those; otherwise placeholder is fine to ship.
3. **Postmark sender for `airabynisarga.com`:** Assumed NOT yet verified. The code degrades gracefully to the console driver — verify this is true post-deploy. If the user has verified the domain in Postmark before this slice ships, set `POSTMARK_FROM_EMAIL=<verified-address>@airabynisarga.com` in Replit secrets so real welcome emails go out.
4. **Mobile viewport edge case:** v4 mockup's `.hero-callout` shows a `flex-direction: column` form below 900px. Verify on a real iOS Safari (the address-bar dance during scroll can clip the sticky nav into the callout).
5. **Existing `apps/web/src/app/dev/emails/page.tsx` structure:** Plan assumes it's a list-of-previews layout. If it's structured differently (single email at a time via route param, for example), adapt Task 3's preview-wiring approach without breaking the existing pattern.
