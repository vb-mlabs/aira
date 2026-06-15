# Plan: Account sub-pages — Notifications, Privacy & Security, Terms, About

**Date:** 2026-06-15
**Slug:** account-sub-pages
**Status:** reviewed
**Author:** mlabs-plan

---

## Problem

The `/account` page (`apps/web/src/app/(app)/account/page.tsx`) renders six menu
rows with chevron-right affordances. Four of those rows currently link to `#`
and are dimmed as placeholders: **Notifications**, **Privacy & security**,
**Terms & privacy**, **About AIRA**. To an end user the chevron implies a
sub-page exists; nothing happens on click. The two rows that DO navigate —
**Edit profile** (→ `/profile`) and **Contact us** (→ `mailto:`) — take the
user away from `/account` with no in-page back affordance; the user has to
hunt for the sidebar (desktop) or the bottom Account tab (mobile) to return.

Result: the account hub feels half-built. The placeholder rows are obvious dead
ends, and the working rows feel like they trap the user.

Two end-user effects:

1. Settings (notification preferences, password change, account deletion) have
   no findable surface from `/account` — they exist deep inside `/profile` as
   sections, but `/account` advertises them as routes that don't work.
2. Legal/about content (Terms, Privacy, About AIRA) has no surface at all.

Success: each of the four placeholder items routes to a real, useful sub-page;
every account sub-page (including the existing `/profile`) has a "← Account"
back affordance.

---

## Scope

**In:**

- Four new routes under `apps/web/src/app/(app)/account/`:
  - `/account/notifications` — real preference toggles (email-on-message,
    email-on-post-interest), persisted, wired into the actual send paths
  - `/account/privacy-security` — password change + delete account, moved out
    of `/profile`
  - `/account/terms` — Terms of Service + Privacy Policy, generic draft copy
    sourced from `packages/config` (brand, support email, legal entity)
  - `/account/about` — About AIRA: brand mission, tagline, version, social
    handle, support contact — all sourced from `packages/config`
- A reusable `<AccountBackLink />` component (`← Account`) rendered at the top
  of every account sub-page AND `/profile`
- New schema: `notification_preferences` columns on `user` (two booleans):
  - `email_on_message_received` boolean NOT NULL DEFAULT true
  - `email_on_post_interest` boolean NOT NULL DEFAULT true
- New service: `packages/services/src/user-preferences/` —
  `getPreferences`, `updatePreferences`
- New API endpoint: `GET /api/v1/profile/preferences`,
  `PATCH /api/v1/profile/preferences`
- Wire email-send paths gated by preferences:
  - `packages/services/src/messages/service.ts` — when a 1:1 message is sent,
    if recipient has `email_on_message_received = true`, send a "you have a
    new message" email via `@aira/email`
  - `packages/services/src/community/service.ts` — when a post_interest is
    expressed, if author has `email_on_post_interest = true`, send a "someone
    responded to your post" email
- Two new React Email templates in `packages/email/src/templates/`:
  - `new-message.tsx`
  - `post-interest-received.tsx`
- Update `/account/page.tsx`: real `href` values for all 4 previously-`#`
  rows; remove `placeholder: true` flag from those rows so they render at
  full contrast
- Update `/profile/page.tsx`: remove `SecuritySection` and `DangerZoneSection`
  (they now live at `/account/privacy-security`); remove `NotificationsSection`
  (the `/account/notifications` sub-page replaces it). `/profile` becomes
  edit-profile-only (`AccountSection` + back link)
- Add Vitest tests for the preferences service (get + update happy path,
  caller-context isolation)
- Integration test for the new email-send gating: send a message with
  recipient pref=false → no email; pref=true → email queued

**Out (deferred):**

- Mobile (Expo) UI for the new account sub-pages — the new
  `/api/v1/profile/preferences` endpoint is built into the REST API per the
  monorepo "one REST API" rule, so mobile can consume it later; building the
  mobile screens is a separate plan
- Per-event subscription matrix (e.g. "email me only for tier1 business
  messages") — toggles are binary per kind
- Marketing email opt-in (no marketing email infra exists)
- "Download my data" / GDPR export
- Marketing-style About page (team photos, press kit, etc.) — sticking to a
  text-only About-AIRA card sourced from `packages/config`
- Real legal review of the draft Terms/Privacy copy (user explicitly accepted
  generic MVP copy with intent to refine before launch)
- Renaming or re-IA-ing `/profile`; it stays as the edit-profile surface

---

## Approach

**Chosen: flat `/account/<slug>` routes + per-page server component, schema
extension on `user`, real email gating wired in the same plan.**

### Routing

Each placeholder becomes its own page under `apps/web/src/app/(app)/account/`:

```
account/
  page.tsx                       (existing hub, edited to drop "#" placeholders)
  _components/
    back-link.tsx                ← Account link, shared
  notifications/
    page.tsx                     server component, fetches prefs via apiServerFetch
    _components/
      preference-toggles.tsx     client component, PATCH on toggle
  privacy-security/
    page.tsx                     reuses SecuritySection + DangerZoneSection
  terms/
    page.tsx                     static, copy from packages/config
  about/
    page.tsx                     static, copy from packages/config
```

`/profile/page.tsx` keeps its own route but loses three of its four sections.

This matches the existing pattern: `apps/web/src/app/(app)/listings/[category]/`
and the admin tree already use per-route folders with co-located
`_components/`.

### Data path (preferences)

Per CLAUDE.md "one REST API for both clients":

1. `packages/services/src/user-preferences/service.ts` — pure functions
   `getPreferences(db, ctx)` and `updatePreferences(db, ctx, args)`. Reads /
   writes the two new boolean columns on `user`. Scoped by `ctx.userId`.
2. `apps/web/src/server/operations/user-preferences.ts` — defineOperation
   wrappers + Zod input schemas (`@aira/validators`).
3. `apps/web/src/app/api/v1/profile/preferences/route.ts` — GET (returns
   current prefs) and PATCH (partial update).
4. `/account/notifications/page.tsx` reads via `apiServerFetch(getPrefsOp)`;
   the client toggle component PATCHes via `apiClient`.

### Email-send wire-up (the part that makes "Real preference toggles" not vapor)

Two new send paths gated by the user's preference:

- `messages/service.ts` → after a successful insert in `sendMessage`, look up
  the recipient's `email_on_message_received`. If true, render
  `new-message.tsx` template and call the email driver. Failure to send must
  NOT roll back the message insert — wrap in try/catch with an `error_log`
  entry.
- `community/service.ts` → after a successful insert in
  `expressInterest`, look up the post author's
  `email_on_post_interest`. Same rendering + same failure semantics.

Both templates use the existing React Email infrastructure
(`packages/email/src/templates/`) and the sRGB hex palette in `brand.emailColors`.

The Postmark driver falls back to console driver when token is missing — this
already works for the verification/reset/email-change templates, so dev
environments see the email content in stdout without further config.

### Static pages (Terms, About)

`/account/terms/page.tsx` and `/account/about/page.tsx` are pure server
components — no client JS. They import from `@aira/config` so the brand name,
support email, social handle, parent entity, etc. all flow through the
single-source-of-truth in `packages/config/src/brand.ts`. The literal "AIRA"
never appears in the route files (ESLint rule `no-brand-string-literal`).

Copy is structured as a `<SectionCard>` per major heading (matches existing
`/profile` visual language). For Terms: "Use of service", "User content",
"Account termination", "Limitation of liability", "Contact". For Privacy:
"What we collect", "How we use it", "Cookies & tracking", "Your rights",
"Contact". For About: brand mission paragraph, tagline pull-quote, "By
{brand.parentName}" credit, support email, social handle, app version
(`process.env.NEXT_PUBLIC_APP_VERSION` if set — fallback "MVP").

### Back-link component

`apps/web/src/app/(app)/account/_components/back-link.tsx` is a tiny client
component (or plain server, since it's just a `<Link>`):

```tsx
<Link href="/account" className="...">
  <ChevronLeft className="size-4" aria-hidden />
  <span>Account</span>
</Link>
```

Rendered at the top of `/account/notifications`, `/account/privacy-security`,
`/account/terms`, `/account/about`, and `/profile`. Hidden on mobile? No —
visible on every viewport, because mobile users especially benefit (sidebar
is behind a hamburger).

### Alternatives considered

- **Option B — break `/profile` apart into `/account/edit-profile`,
  `/account/notifications`, `/account/privacy-security` (full IA refactor).**
  Rejected: too much churn for the wedge. The user explicitly picked "Keep
  /profile, add /account/\* sub-pages" — minimal disruption to existing
  callers (e.g. the `/account` Edit profile row, any deep links in emails).
  We can revisit the IA later.
- **Option C — sub-pages link/scroll to existing `/profile` sections via
  anchors** (e.g. `/account/notifications` → `/profile#notifications`).
  Rejected: breaks the back-link UX (anchor jumps land users mid-page on a
  multi-section view), and conflates "/account is a hub" with "/profile is
  the editor" — exactly the design tension we're trying to fix.
- **Option D — preferences in a new `user_preferences` table.** Rejected for
  v1 (2 booleans don't justify a join), but worth a follow-up if we add
  >5 toggles. Adding columns to `user` keeps reads in the existing
  `requireUser()` path with no extra query.
- **Option E — ship toggle UI without wiring email sends.** Rejected as
  vapor — the user's stated preference was "Real preference toggles"; a
  toggle that doesn't gate anything is worse than no toggle.

---

## Data model changes

Add two columns to `user` (Drizzle schema in `packages/db/src/schema/auth.ts`):

```ts
email_on_message_received: boolean("email_on_message_received")
  .notNull()
  .default(true),
email_on_post_interest: boolean("email_on_post_interest")
  .notNull()
  .default(true),
```

Migration via `pnpm db:generate` then `pnpm db:migrate`. Defaults to `true`
because the current behavior is "always notify in-app"; flipping the defaults
to false would silently change behavior for existing users in a way they
didn't consent to. New email is the additive change — they get the in-app
notification PLUS an email by default. (Trade-off: this could increase email
volume; reviewer to confirm acceptable for MVP scale.)

No new tables. No changes to `notifications` or `community-post` schemas.

---

## Files to touch

**New:**

- `apps/web/src/app/(app)/account/_components/back-link.tsx`
- `apps/web/src/app/(app)/account/notifications/page.tsx`
- `apps/web/src/app/(app)/account/notifications/_components/preference-toggles.tsx`
- `apps/web/src/app/(app)/account/privacy-security/page.tsx`
- `apps/web/src/app/(app)/account/terms/page.tsx`
- `apps/web/src/app/(app)/account/about/page.tsx`
- `packages/services/src/user-preferences/service.ts`
- `packages/services/src/user-preferences/index.ts`
- `packages/services/src/user-preferences/__tests__/service.test.ts`
- `apps/web/src/server/operations/user-preferences.ts`
- `apps/web/src/app/api/v1/profile/preferences/route.ts`
- `packages/validators/src/user-preferences.ts` (Zod schemas)
- `packages/email/src/templates/new-message.tsx`
- `packages/email/src/templates/post-interest-received.tsx`
- Migration file (auto-generated by `pnpm db:generate`)

**Edit:**

- `packages/db/src/schema/auth.ts` — add the two boolean columns
- `packages/services/src/index.ts` — re-export user-preferences service
- `packages/services/src/messages/service.ts` — gate "new message" email send
- `packages/services/src/community/service.ts` — gate "post interest" email
  send
- `packages/validators/src/index.ts` — re-export user-preferences schemas
- `apps/web/src/server/operations/index.ts` — register new ops
- `apps/web/src/app/(app)/account/page.tsx` — replace `#` hrefs, drop
  `placeholder` flag for the four newly-real items
- `apps/web/src/app/(app)/profile/page.tsx` — remove `SecuritySection`,
  `NotificationsSection`, `DangerZoneSection`; add `<AccountBackLink />`
- `apps/web/src/features/profile/index.ts` — keep exports (other callers may
  still need them, e.g. `/account/privacy-security` will reuse
  `SecuritySection` and `DangerZoneSection`)

---

## Edge cases

- **Email-send failure must not roll back the underlying write.** A Postmark
  outage cannot drop messages or community responses. Wrap email send in
  try/catch, log to `error_log`, never rethrow.
- **Recipient not found / deleted between send and email lookup** — service
  returns null prefs → treat as "default true" (won't happen in practice
  because the message insert FK would have failed already, but be explicit).
- **User deletes account from `/account/privacy-security`** — cascade delete
  per existing `DangerZoneSection` behavior. After deletion, they're logged
  out and bounced to the marketing page. No new wiring needed.
- **PATCH /preferences with unknown column** — Zod rejects at the validator
  boundary (`.strict()` schema).
- **Concurrent toggle clicks** — last-write-wins; the PATCH is idempotent and
  the UI is small enough that a stale value resolves on next page load. No
  optimistic locking needed for binary toggles.
- **`/account/terms` and `/account/about` page weight** — pure server
  components, no client JS bundle impact. SSR + static.
- **Back link on `/profile`** — if a user landed on `/profile` from somewhere
  OTHER than `/account` (e.g. a bookmark), the back link still says
  "← Account" and goes there. Acceptable — `/account` is the canonical hub.
- **Mobile email volume blowup** — defaults are `true` for both new toggles,
  which means existing users start receiving emails they didn't opt into.
  Reviewer to weigh: ship with defaults-true (simpler, may annoy), or
  defaults-false (safer, but the feature feels broken until users find the
  toggle).

---

## Acceptance criteria

- [ ] `/account` page: Notifications, Privacy & security, Terms & privacy,
      About AIRA rows all link to real routes (not `#`) and render at full
      contrast (no `placeholder: true` flag).
- [ ] `/account/notifications`: renders two toggles with current values,
      labeled clearly ("Email me when someone sends me a message", "Email me
      when someone responds to my community post"). Toggling persists via
      `PATCH /api/v1/profile/preferences` and shows success/error feedback.
- [ ] `/account/privacy-security`: renders the existing
      `SecuritySection` (password change) and `DangerZoneSection` (delete
      account) components — both work identically to their current behavior
      on `/profile`.
- [ ] `/account/terms`: renders Terms of Service + Privacy Policy sections
      using copy that references `brand.name`, `brand.supportEmail`,
      `brand.legalEntity`, `brand.parentName` — no string literal "AIRA".
- [ ] `/account/about`: renders brand mission, tagline, parent attribution,
      support email, social handle, version string — sourced from
      `packages/config`.
- [ ] `<AccountBackLink />`: visible at the top of `/profile`,
      `/account/notifications`, `/account/privacy-security`, `/account/terms`,
      `/account/about`. Clicking returns to `/account`.
- [ ] `/profile` no longer renders Security, Notifications, or Danger Zone
      sections. Page shows only the Account section + back link.
- [ ] Schema migration adds `email_on_message_received` and
      `email_on_post_interest` to `user` with default `true`; applies cleanly
      via `pnpm db:migrate`.
- [ ] `GET /api/v1/profile/preferences` returns the authenticated user's
      preferences (401 for unauthenticated).
- [ ] `PATCH /api/v1/profile/preferences` accepts a partial body, validates
      with `.strict()` Zod, updates only the columns sent, returns 200 with
      the new values.
- [ ] Sending a 1:1 message to a user with `email_on_message_received=true`
      triggers a `new-message` email (visible via console driver in dev).
      With `false`, no email is sent. The message insert succeeds in both
      cases.
- [ ] Expressing interest on a post whose author has
      `email_on_post_interest=true` triggers a `post-interest-received`
      email. With `false`, no email. Insert succeeds in both.
- [ ] Email-send failure (mock Postmark error) does NOT abort the underlying
      service call; an `error_log` row is written.
- [ ] All four new `account/*` routes are reachable for authenticated end
      users; unauthenticated requests redirect via the `(app)` layout's
      `requireUser`.
- [ ] `pnpm typecheck` and `pnpm lint` pass; no `no-brand-string-literal`
      violations in the new route files or new email templates.
- [ ] Vitest tests pass for the user-preferences service (happy path + per-user
      isolation).
- [ ] Integration test passes for the new email-gating in messages and
      community services.

---

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Default preference values.** Default `email_on_message_received` and
   `email_on_post_interest` to `true` (current behavior is in-app-only,
   adding email is opt-out) or `false` (opt-in, less email volume but the
   feature feels broken until found)? The plan defaults to `true`; reviewer
   to confirm.
2. **Should the back link also appear on `/account` itself?** No — it's the
   hub and the sidebar/tab-bar already handles outward navigation. Stated for
   clarity, but reviewer may push back.
3. **Notification preferences: separate table vs columns on user.** Plan
   uses columns (2 booleans). Reviewer to confirm we won't add another 5+
   toggles in the next two sprints (which would justify a `user_preferences`
   table now).
4. **Email template aesthetic for new-message / post-interest-received** —
   match existing `verify-email` / `password-reset` templates' layout
   (header card + body + CTA button) or design fresh? Plan assumes match.
5. **Terms / Privacy / About copy** — user accepted generic MVP draft copy.
   Reviewer to flag if any specific clauses or boilerplate must be present
   (e.g. CCPA, GDPR data-processing addenda) before we ship the draft.
6. **Version string for the About page** — read from
   `process.env.NEXT_PUBLIC_APP_VERSION` (needs `apps/web/src/config/env.ts`
   update) or from a build-time constant baked into the bundle? Plan favors
   the env-var route; reviewer to decide.
7. **Out-of-scope confirmation: mobile Expo screens.** Confirming explicitly
   that this plan ships REST endpoint + web UI only; mobile is a follow-up
   plan. (The Expo app already consumes `/api/v1/profile/*` for the existing
   profile editor, so the new endpoint is consumable from mobile day-one.)
