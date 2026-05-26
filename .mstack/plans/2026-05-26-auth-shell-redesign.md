# Plan: Auth shell redesign to match the Figma login mockup

**Date:** 2026-05-26
**Slug:** auth-shell-redesign
**Status:** implemented
**Author:** Claude (with framer@millionlabs.co.uk as project lead)
**Reviewed:** [../reviews/2026-05-26-auth-shell-redesign.md](../reviews/2026-05-26-auth-shell-redesign.md) (UI-Significant: yes)
**Implemented:** [../code/auth-shell-redesign/report.md](../code/auth-shell-redesign/report.md) (8 commits 2fbefda..ec70442 on `feat/auth-shell-redesign`)

---

## Problem

The current `/login` and `/signup` screens on both web and mobile ship the MLabs template's generic shadcn shell: an "AIRA" wordmark next to a small orange dot, a `text-2xl font-bold tracking-tight` heading in Lato bold, and a primary-coloured button. None of the brand-soul lives there — no tree-of-life iconography, no Cormorant heading gravitas, no "AIRA by Nisarga" attribution. The Figma export at `attached_assets/Login_1779692555305.png` makes the gap concrete: the design centres a large ornate tree-of-life logo, a Cormorant `Welcome Back!` title, a small `Sign in to continue to AIRA` subtitle in a muted brown, white rounded inputs labelled `Email or Phone` and `Password`, a full-width olive `Sign In` CTA, and an "AIRA by Nisarga" footer pinned to the bottom of the page.

A first-time AIRA user — the older-skew Atlanta Indian community we're building for, per `.mstack/design-system/DESIGN.md`'s voice notes — should land on `/login` and immediately feel they're inside AIRA's product, not a generic SaaS template. The template polish on the marketing page already does this; auth is the part of the funnel that screams "template" loudest right now.

Success: every `(auth)` route on web (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`) renders the tree-of-life logo at the top, Cormorant heading + Lato body subtitle, white rounded card with olive CTA, "AIRA by Nisarga" footer pinned bottom, on the locked paper-cream `background` token. Mobile mirrors the structure across `welcome.tsx`, `login.tsx`, `sign-up.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify.tsx`, `check-email.tsx`. Auth wiring stays untouched.

**Primary persona:** AIRA end-users (Atlanta Indian community, older skew). Auth is their first touchpoint with the product.
**Wedge:** the visual handoff from the polished marketing page (`/`) into the generic template auth surface is jarring. Fixing it removes the "this looks unfinished" instinct that costs us trust before sign-up has even started.

## Scope

**In:**

- **Shared `<AuthShell>` pattern on web:** extract the layout-level structure (tree-of-life logo, paper-grain background, "AIRA by Nisarga" footer, content card) into `apps/web/src/app/(auth)/layout.tsx` so every `(auth)` route inherits it. Each route's `page.tsx` provides only the per-screen heading, subtitle, form, and auxiliary links.
- **Web pages updated:** `/login` (incl. its existing `IdleBanner`), `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, plus the `(auth)/login/success` state. Heading uses Cormorant via `font-display`; subtitles in Lato `text-base text-muted-foreground`. The signup link copy on `/login` becomes "Sign Up" title case; the back-to-sign-in link on `/signup` stays "Sign in".
- **Email label adapted to "Email" only.** Figma says "Email or Phone" but phone OTP is deferred to S1.5 per `roadmap.md`. Keeping the misleading label would catch users who type a phone number and get a Zod email-validation error. When S1.5 ships, the label flips to "Email or Phone" and the Zod schema accepts both — a one-line copy change.
- **Mobile parity:** the same five auth screens on `apps/mobile/app/(auth)/` + the already-shipped `welcome.tsx` extended to the same visual treatment. Mobile's existing `(auth)/_layout.tsx` is a bare `Stack` (each screen draws its own header); since Expo Router layouts can't conditionally wrap variable content the way Next.js Server Components do, the redesign goes into a shared mobile `<AuthShell>` component (`apps/mobile/components/AuthShell.tsx`) that every screen imports. The tree-of-life PNG gets copied to `apps/mobile/assets/logo.png` so `require()` works at build time.
- **Tree-of-life logo asset:** the PNG already exists at `apps/web/public/marketing-images/logo.png` (used by the marketing hero + nav). Reuse that for web. For mobile, copy into `apps/mobile/assets/` and `require()` it.
- **`brand.parentName` field:** add `parentName: "Nisarga"` to `packages/config/src/brand.ts` so the "AIRA by Nisarga" footer composition is `${brand.name} by ${brand.parentName}` — keeps the locked `no-brand-string-literal` ESLint rule happy (only `brand.name` literally appears anywhere, and that's already allowed from `@aira/config`).
- **No new design tokens.** Everything maps to the existing locked palette: `background` cream for the page, `card` lighter cream for the input/card backgrounds, `primary` olive for the CTA + focus ring, `foreground` warm dark brown for headings, `muted-foreground` for subtitles + footer.

**Out (deferred):**

- **Phone OTP input** — Sprint 1.5. Label switches to "Email or Phone" then.
- **Mobile font loading** (Cormorant Garamond + Lato actually rendering on iOS/Android). Tracked in `TODOS.md` § "Mobile native typography" — needs `@expo-google-fonts/*` deps + `expo-font` setup, deferred to the pre-TestFlight pass. **Until that lands, the mobile auth redesign will inherit System fonts on real devices** — accepted visual gap.
- **TOTP MFA challenge UI on `/login`** — Sprint 1.5 (`.mstack/plans/2026-05-26-auth-rbac-hardening.md` deferred MFA explicitly).
- **Social auth buttons** (Google / Apple) — Phase 2+.
- **Marketing page redesign** — already shipped, untouched.
- **Auth wiring** (`signIn` / `signUp` / Better Auth handlers, `apps/web/src/lib/auth/*`, the `/api/auth/*` routes) — pure UI slice. Forms continue to call the same hooks/actions.

## Approach

**Chosen: lift the brand chrome into `(auth)/layout.tsx` on web; mirror via a shared `<AuthShell>` component on mobile.**

Web's Next.js `(auth)/layout.tsx` already wraps every auth route — it's where the orange-dot wordmark + top glow + card currently live. Replacing those three pieces with the Figma's structure (tree-of-life logo above the card, paper-grain background via the existing CSS variables in `globals.css`, "AIRA by Nisarga" footer pinned at the bottom of the page) is one focused edit, and every `(auth)` page picks it up without touching their own files except for the per-screen copy. The `IdleBanner` Suspense wrapper that landed in T10 of the RBAC slice stays in `login/page.tsx` — it's the only auth screen that ever reads `?reason=idle`.

Mobile can't use a single layout to do the same thing — Expo Router's `Stack` layouts render headers/tabs but don't compose into the screen body. So mobile takes the same conceptual structure as a reusable `<AuthShell>` component (`apps/mobile/components/AuthShell.tsx`), and every auth screen wraps its content in `<AuthShell>{...}</AuthShell>`. The shell handles `SafeAreaView`, `KeyboardAvoidingView`, `ScrollView`, the centred logo, the "AIRA by Nisarga" footer, and the cream `bg-background` page colour — so individual screens go from ~100 lines of boilerplate to ~30 lines of just-the-form.

For the `brand.parentName: "Nisarga"` addition, the no-brand-string-literal ESLint rule reads `brand.name` from `packages/config/src/brand.ts` at lint time and forbids the literal anywhere outside the allowlist. Adding a sibling field doesn't break the rule — only `brand.name` is the policed literal, and the footer's "AIRA by Nisarga" composition lives in JSX as `{brand.name} by {brand.parentName}` (no hard-coded "AIRA" anywhere).

Web's paper-grain background is already an SVG-defined CSS variable (`--texture-paper`, declared in `apps/web/src/app/globals.css` per the design-system doc). The marketing page uses it. The (auth) layout doesn't currently — adding `style={{ background: "var(--texture-paper)" }}` to the layout's root `<main>` is the one-line wire-up. Mobile doesn't have a paper-grain equivalent yet; for now mobile uses the flat cream `bg-background` token. TODOS.md already tracks "Paper-grain texture asset fallback" for the mobile case.

**Alternatives considered:**

- **Option B — extract a new `<AuthShell>` component in `@aira/ui-web`.** Cleaner abstraction if multiple apps needed it, but we only have web and mobile in this monorepo, and mobile would need its own `<AuthShell>` anyway (React Native components vs DOM primitives). Net result: two components, one shared name, zero actual reuse — over-engineered.
- **Option C — render the logo + footer in each `page.tsx`, no layout changes.** More flexibility (a page could opt out) but five web pages × ~20 lines of duplicated chrome = 100 lines of boilerplate that drift the moment one page is updated and the others aren't. The (auth) layout is the obvious place; that's what it exists for.
- **Option D — adopt a third-party auth-screen kit (e.g. clerk-style components).** Rejected on principle (CLAUDE.md "Don't introduce a new ORM / auth lib / styling system") — Better Auth + shadcn primitives + our design tokens already cover everything.

## Data model changes

None. This is a pure UI slice. No schema migrations.

## Files to touch

**New:**

- `apps/mobile/components/AuthShell.tsx` — shared shell for every mobile `(auth)` screen: `SafeAreaView`, `KeyboardAvoidingView`, `ScrollView`, centred tree-of-life image, content slot, "AIRA by Nisarga" footer.
- `apps/mobile/assets/logo.png` — copy of `apps/web/public/marketing-images/logo.png`. Embedded via `require("../../assets/logo.png")` so it survives bundler hashing.

**Edit:**

- `packages/config/src/brand.ts` — add `parentName: "Nisarga"` after `legalEntity`.
- `apps/web/src/app/(auth)/layout.tsx` — replace the orange-dot wordmark with `<Image src="/marketing-images/logo.png" alt="AIRA" width={120} height={120}>` (next/image), drop the radial gradient (the paper-grain handles atmosphere), add paper-grain `background` style, append a sticky-bottom `<footer>` with `{brand.name} by {brand.parentName}` in `text-xs text-muted-foreground`.
- `apps/web/src/app/(auth)/login/page.tsx` — heading "Welcome Back!" via `<h1 className="font-display text-3xl tracking-tight">`, subtitle "Sign in to continue to {brand.name}." (composed with brand.name to satisfy lint), button text title-case "Sign In", signup link text "Sign Up". Keep IdleBanner, keep submit logic, keep validation.
- `apps/web/src/app/(auth)/signup/page.tsx` — heading "Create your account" stays, subtitle softened, button "Sign Up", sign-in link "Sign In". Match input + spacing rhythm.
- `apps/web/src/app/(auth)/forgot-password/page.tsx`, `/reset-password/page.tsx`, `/verify-email/page.tsx` — same Cormorant heading + Lato subtitle + olive button treatment; copy stays as-is (already terse and on-voice).
- `apps/mobile/app/(auth)/_layout.tsx` — no structural change (it still returns a bare `Stack` for navigation), but the comment header updates to point at the new `<AuthShell>` pattern.
- `apps/mobile/app/(auth)/login.tsx` — wrap content in `<AuthShell>`. Remove the inline wordmark (now in shell). Heading "Welcome Back!" via `Text className="font-display text-4xl"`. Same submit logic.
- `apps/mobile/app/(auth)/sign-up.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify.tsx`, `check-email.tsx`, `welcome.tsx` — same shell wrap + heading/subtitle copy alignment.

## Edge cases

- **Mobile fonts not yet loaded on iOS/Android** — `apps/mobile/lib/fonts/index.ts` is a stub. Cormorant + Lato don't actually render on real devices. The redesign falls back to System font on mobile. The `font-display`/`font-sans` classes still apply correctly (NativeWind doesn't error); the visual just looks System-y. **Accepted gap until the TODOS entry "Mobile native typography" lands.** Captured in Open Questions in case reviewer wants to fold it in.
- **`(auth)/login/_components/idle-banner.tsx`** stays where it is. The banner sits above the page's heading inside the card. Layout-level changes don't touch it.
- **Brand name string literal lint rule** — `brand.parentName: "Nisarga"` is a new field. The literal `"Nisarga"` only appears in `packages/config/src/brand.ts`, which is in the rule's allowlist. The footer uses `{brand.name} by {brand.parentName}` so the rule sees no offending literals.
- **Logo size on small viewports** — the Figma render is generous (~120px). On a narrow mobile web window the logo eats vertical space; cap with responsive sizing (`size-24 md:size-30`).
- **Verify-email success state** — currently lives inline in `signup/page.tsx` as the "Check your email" branch. Keep that shape but apply the same Cormorant heading + olive button + "Resend" link treatment.
- **`/verify-email` route on web** — confirm whether it has a UI or is just a callback. If it's a callback (Better Auth processes the token and redirects), no UI changes needed. **Reviewer to confirm.**
- **`apps/mobile/app/(auth)/welcome.tsx`** — already partially polished (wordmark + tagline + dual CTAs per the 2026-05-24 plan). After this redesign, welcome's wordmark becomes the tree-of-life logo via the shared `<AuthShell>`, and the screen still acts as the dual-CTA entry point. Risk: if the logo also appears on login, the user sees it twice (welcome → tap "Sign in" → login both show the logo). That's not necessarily bad — it's brand reinforcement — but reviewer should sanity-check the flow.
- **The IdleBanner Suspense wrapper** — already in `login/page.tsx`. Stays unchanged; the redesign renders it above the heading inside the card so the "Signed out for inactivity" copy is immediately visible when an idle-bounced admin lands.
- **Server-rendered hydration mismatch** — the (auth) layout will be a Server Component (no `"use client"`). `next/image` for the logo is fine; the brand composition `{brand.name} by {brand.parentName}` is plain text. Should hydrate cleanly.

## Acceptance criteria

- [ ] On web, `/login` renders the tree-of-life PNG (≥100px), Cormorant `Welcome Back!` heading, Lato subtitle "Sign in to continue to AIRA.", "Email" label (not "Email or Phone"), olive full-width `Sign In` button, "Don't have an account? Sign Up" centred link, and a footer reading "AIRA by Nisarga" pinned at the bottom of the viewport (or below the card on tall content).
- [ ] On web, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` all share the same chrome (logo + footer + page background) inherited from `(auth)/layout.tsx`; each page provides only the heading / subtitle / form content.
- [ ] `(auth)/layout.tsx` no longer references the orange dot or `brand.name` as the wordmark — the tree-of-life image replaces it.
- [ ] `packages/config/src/brand.ts` exports `parentName: "Nisarga"`; no other file in the repo contains the literal string `"Nisarga"` (verified by `git grep` excluding the brand.ts file, docs/, tests/).
- [ ] `pnpm lint` passes — the no-brand-string-literal rule still green.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes (no test files should need changing; the touch list is pure UI).
- [ ] On mobile, `apps/mobile/components/AuthShell.tsx` exists and is imported by all seven auth screens (`welcome`, `login`, `sign-up`, `forgot-password`, `reset-password`, `verify`, `check-email`). `apps/mobile/assets/logo.png` exists. Each screen's wordmark/banner chrome is removed (now in shell).
- [ ] On mobile, the redesigned `/login` and `/sign-up` screenshots — captured via the existing Maestro flows or a manual screenshot — show the tree-of-life logo, header card, olive CTA, and footer in the same arrangement as the web counterparts.
- [ ] `/login?reason=idle` still surfaces the `IdleBanner` above the form (regression check for the auth-rbac-hardening slice).
- [ ] All five web auth screens render correctly at 375px viewport (mobile web) — no overflow, logo scales down, form takes full width.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation:

- **Mobile font loading.** TODOS.md tracks this for the pre-TestFlight pass. Including it here would add `@expo-google-fonts/lato`, `@expo-google-fonts/cormorant-garamond`, and `expo-font` deps + a small loading-state at app root. Pulling it in makes the mobile redesign actually look right; deferring it means the redesign ships with System fonts on real devices. The user's stated constraint set explicitly did NOT include "no new deps" — so the dep cost is acceptable in principle. Reviewer's call on whether to fold it in.
- **Sibling auth screens' visual fidelity beyond login.** The Figma export only shows the login screen. `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` will be derived from the login pattern + the locked design system. Worth a `/mlabs-mockup` round-trip to lock the per-screen heading + spacing before `/mlabs-code` executes, or trust the engineering pattern? UI-Significant flag computation in the review will trigger the mockup gate either way.
- **Footer placement on short viewports.** "AIRA by Nisarga" can be sticky-bottom (always at the page foot regardless of content height) or document-flow (after the card, so it scrolls). Figma's mockup has it at the bottom of the visible viewport but the content above doesn't fill the screen — could be either interpretation. Reviewer to pick or defer to mockup.
- **Welcome screen vs login screen logo duplication.** Mobile flow is `welcome.tsx → login.tsx`. If both render the tree-of-life prominently, the user sees it twice in sequence. Possible call: welcome keeps the *large* logo as a hero, login uses a smaller header version. Reviewer to confirm or punt to mockup.
- **`/verify-email` route shape.** Is it a UI page or a callback-only Better Auth route? If callback, drop it from this plan's scope. The file `apps/web/src/app/(auth)/verify-email/page.tsx` exists per earlier inspection, but its content wasn't read — confirm during review.
