# Plan: Mobile welcome screen + root session gate

**Date:** 2026-05-24
**Slug:** 2026-05-24-mobile-welcome-and-session-gate
**Status:** implemented
**Author:** VB (framer@millionlabs.co.uk)

---

## Problem

The Expo app (`apps/mobile/`) ships with a full Better Auth flow (login, sign-up,
forgot-password, reset-password, verify, check-email) but lands cold-launch users
directly on `/login`, with no welcome/intro and no session-aware routing. That
falls short of "production-grade template" in three concrete ways:

1. **No welcome screen.** A new user opens the app and is immediately confronted
   with an email field. There's no wordmark moment, no tagline, no choice
   between "Sign in" and "Create account" — just a login form. Forks get a
   template that looks half-finished.
2. **No cold-launch session gate.** `app/_layout.tsx` declares `(auth)` first,
   so Expo Router falls through to `/login` on every cold launch — even for a
   user with a valid refresh token in SecureStore. They see the login form
   briefly before any code can redirect them.
3. **No deep-link / expiry guard on `(app)`.** The tab group has no route
   guard. It relies on individual screens calling `useMe()` and `profile.tsx:183`
   redirecting on a 401. A push-notification deep link into `/(app)/messages/xyz`
   from a session-expired state would land the user on a screen that 401s
   immediately with no auto-bounce to login.

Success: a forked MLabs MVP feels polished out of the box — splash holds until
session resolves, authenticated users go straight to `(app)`, unauthenticated
users see a branded welcome → choose Sign in / Create account, and deep links
into `(app)` from an expired session bounce cleanly back to welcome.

**Primary persona:** fork developers building MLabs MVPs who want a template
that's ready to ship without re-doing the auth shell. Secondary: end-users of
those forked apps, who get a polished cold-launch experience.

## Scope

**In:**

- New `apps/mobile/app/(auth)/welcome.tsx` — single screen: wordmark + tagline
  (from `@mlabs/config` brand) + two CTAs (`Sign in` → `/login`, `Create account`
  → `/sign-up`).
- New `apps/mobile/app/index.tsx` — top-level route that runs `useMe()` and
  returns `<Redirect href="/(app)" />` if session, `<Redirect href="/(auth)/welcome" />`
  if not. No UI of its own (splash covers it).
- Edit `apps/mobile/app/_layout.tsx` — extend the splash-hold to wait on
  `fontsLoaded && !me.isPending` so cold-launch routing is invisible to the user.
- Edit `apps/mobile/app/(app)/_layout.tsx` — add a `useMe()` gate that returns
  `<Redirect href="/(auth)/welcome" />` if `me.isError` (defense-in-depth for
  deep links and mid-session refresh-token expiry).
- Edit `apps/mobile/app/(auth)/_layout.tsx` — add a `useMe()` gate that returns
  `<Redirect href="/(app)" />` if a session is present (so a signed-in user who
  somehow navigates to `/login` is bounced back).
- Edit `apps/mobile/app/(app)/profile.tsx:183,196` — remove the local
  `router.replace("/(auth)/login")` calls now that the gate handles it (avoid
  double-routing).
- New Maestro flow: `apps/mobile/.maestro/11-welcome-cold-launch.yaml` —
  fresh install → see welcome → tap "Sign in" → land on login.
- New Maestro flow: `apps/mobile/.maestro/12-deep-link-expired-session.yaml` —
  store stale refresh token → cold launch → expect welcome (not crash).

**Out (deferred):**

- Multi-slide onboarding carousel (single-screen welcome is the locked shape).
- Social sign-in (Apple / Google). Requires Better Auth server provider config,
  EAS `usesAppleSignIn` entitlement, `GoogleService-Info.plist`, mandatory Apple
  SIWA-if-any-social rule. Separate feature, not template polish.
- Animated splash (Lottie / Reanimated entrance). Native splash is sufficient.
- Locale picker on welcome (template is single-locale today).
- Reset of `useMe()` cache on sign-out — already handled by `useSignOut()`
  via `qc.clear()` in `features/auth/hooks.ts:55`.
- Web preview of welcome screen — Expo Router covers it for free; no extra
  work needed.

## Approach

**Two-layer session gate (Expo Router idiom).** Add a declarative top-level
`app/index.tsx` that uses `<Redirect/>` based on `useMe()`. This is the
recommended Expo Router pattern (vs imperative `router.replace` in an effect,
which races with navigator mount and causes a flash of the wrong screen). The
top-level gate covers cold launch; per-group gates in `(app)/_layout.tsx` and
`(auth)/_layout.tsx` cover deep links and post-launch session transitions.

**Hold the splash, don't add an in-app one.** `app/_layout.tsx:15` already calls
`SplashScreen.preventAutoHideAsync()` and waits on `fontsLoaded`. Extend that
guard to also wait on `!me.isPending`. The native splash already matches the
locked design spec (brand orange + wordmark) — adding an in-app spinner would
be a second, slightly-different loading state for no benefit. Net visual UX:
splash → (app) or splash → welcome, zero flicker.

**Welcome screen reuses existing primitives.** No new components. Use
`SafeAreaView` + `Text` + `Button` from `components/ui/Button.tsx`, the
`brand.name` / `brand.tagline` from `@mlabs/config` (same source as the auth
screens — see `login.tsx:19`), and the `Link` / `router` from `expo-router` for
CTA navigation. Matches the design DNA of the existing auth screens.

**Alternatives considered:**

- **Imperative gate in `_layout.tsx` with `router.replace` in an effect** —
  rejected. Races the navigator mount; produces a one-frame flash of the
  wrong screen on slow devices; harder to reason about than declarative
  `<Redirect/>`.
- **Top-level gate only (no per-group guards)** — rejected. Leaves deep
  links into `(app)` and mid-session refresh-token expiry unhandled. A push
  notification deep link from an expired session would crash into a 401ing
  tab bar.
- **Per-group guards only (no top-level `index.tsx`)** — rejected. Falls
  back to Expo Router's first-registered-screen behavior on cold launch,
  which means `(auth)` renders first and the guard *then* redirects — still
  a flash.
- **Multi-slide onboarding carousel** — rejected per user direction.
  Template should ship lean; forks add their own onboarding if needed.
- **Social sign-in stub buttons** — rejected per user direction. Stub UI
  with "TODO: enable in fork" is worse than no UI — it implies the template
  half-supports something it doesn't.
- **In-app splash with spinner** — rejected. Duplicates the native splash
  for no visual benefit. Native splash + `preventAutoHideAsync` gives a
  flicker-free hand-off.

## Data model changes

None. This is a routing + UI shell change; no server or schema touch.

## Files to touch

**New:**

- `apps/mobile/app/index.tsx` — top-level session router. Uses `useMe()`;
  returns `<Redirect href="/(app)" />` if `me.data`, `<Redirect href="/(auth)/welcome" />`
  if `me.isError` or `!me.data`. Returns `null` while `me.isPending` (splash
  is still up).
- `apps/mobile/app/(auth)/welcome.tsx` — single-screen welcome. Wordmark
  (`brand.name`), tagline (`brand.tagline`), two `<Button>`s: primary
  "Create account" → `/sign-up`, secondary/outline "Sign in" → `/login`.
  `SafeAreaView` wrapper, matches design system of existing auth screens.
- `apps/mobile/.maestro/11-welcome-cold-launch.yaml` — fresh install →
  welcome → tap "Sign in" → login screen visible.
- `apps/mobile/.maestro/12-deep-link-expired-session.yaml` — seed stale
  refresh token in SecureStore → cold launch → welcome screen visible
  (no crash, no flash of tab bar).

**Edit:**

- `apps/mobile/app/_layout.tsx` — extend splash-hold gate. Add `useMe()`,
  hide splash only when `fontsLoaded && !me.isPending`. Keep all existing
  providers (SafeAreaProvider, QueryClientProvider, ToastProvider) untouched.
- `apps/mobile/app/(app)/_layout.tsx` — add `useMe()` gate at top of
  `AppLayout()`. If `me.isError` or `(!me.isPending && !me.data)`, return
  `<Redirect href="/(auth)/welcome" />`. Otherwise render existing `<Tabs>`.
- `apps/mobile/app/(auth)/_layout.tsx` — add `useMe()` gate. If `me.data`,
  return `<Redirect href="/(app)" />`. Otherwise render existing `<Stack>`.
  Skip the redirect during `me.isPending` (return null — splash covers).
- `apps/mobile/app/(app)/profile.tsx` — remove the two
  `router.replace("/(auth)/login")` calls at `:183` and `:196`. The
  `useSignOut().onSuccess` (`features/auth/hooks.ts:55`) calls `qc.clear()`,
  which invalidates `useMe()`; the `(app)/_layout.tsx` gate then redirects
  to `/(auth)/welcome` automatically. Keep the `signOutRequest` call.
- `apps/mobile/app/(auth)/login.tsx:49` — change `router.replace("/(app)")`
  target unchanged, but verify it still works under the new gate (it should —
  on successful login, `useMe()` invalidation flips the `(auth)` gate to
  redirect to `(app)` *and* the explicit `router.replace` in the success
  handler still fires. Net: one redirect, no race.) No code change expected;
  flagged here so the reviewer confirms.

## Edge cases

- **Session-pending flicker.** `useMe()` runs on every mount. If a user signs
  out from `(app)/profile` and `useMe()` flips to error, the `(app)` gate
  redirects — but if the redirect target's gate (`(auth)`) is also evaluating
  `useMe()` and briefly returns `null`, there's a possible blank frame.
  Mitigation: while `me.isPending` in `(auth)/_layout.tsx`, render the stack
  (don't return `null`) — the welcome screen is a safe default to paint.
- **Refresh token expiry mid-session.** User taps a tab; `meRequest()` 401s;
  `useMe()` flips to error; `(app)/_layout.tsx` gate redirects to welcome.
  Verify the in-flight `useQuery` doesn't infinite-loop (retry: false is
  already set in `features/auth/hooks.ts:13`).
- **Deep link to `/(app)/messages/[id]` with expired token.** Expo Router
  resolves the route, the `(app)` layout mounts, `useMe()` errors, gate
  redirects to welcome. **Pending intent is lost** — the user lands on welcome
  with no breadcrumb back to the message. Out of scope for this plan
  (intent-preservation is a separate feature), but flag in `(app)/_layout.tsx`
  with a comment for future work.
- **`useMe()` first-load network error vs auth error.** If the API is
  unreachable (airplane mode, dev server down), `meRequest()` throws a
  non-401 error. Today's behavior: `useQuery` flips to error; gate would
  redirect to welcome. That's wrong — user with valid tokens shouldn't be
  bounced to welcome because of a transient network failure. Mitigation:
  in `meRequest()` (`features/auth/api.ts:158`), distinguish 401 from
  other errors. The gate should only redirect on `ApiError && status === 401`.
  Pass an `isUnauthenticated` flag through the hook so the layouts can read it
  cleanly.
- **Sign-out double-redirect.** Removed `router.replace` from `profile.tsx`,
  relying on the gate. Verify `qc.clear()` invalidates `useMe()` synchronously
  enough that the next render cycle sees `me.data === undefined` and the gate
  fires once, not twice.
- **Web preview.** Expo Router runs on web; `<Redirect/>` works there too.
  Verify `pnpm --filter @mlabs/mobile web` cold-launches into welcome (no
  SecureStore on web; tokens read as null; gate redirects to welcome). Splash
  behavior on web is best-effort — native splash plugin is no-op, so a brief
  blank frame is acceptable.
- **Brand string lint.** The new `welcome.tsx` reads `brand.name` /
  `brand.tagline` from `@mlabs/config` — no string literal of "MLabs Template"
  should appear. The ESLint `no-brand-string-literal` rule
  (`packages/config/src/brand.ts:6`) will catch violations.

## Acceptance criteria

- [ ] Cold launch with no stored tokens → splash visible until fonts + `useMe()`
      settle → welcome screen with wordmark, tagline, and two CTAs.
- [ ] Cold launch with valid tokens → splash visible until fonts + `useMe()`
      settle → `(app)` home tab visible. Zero flash of welcome or login.
- [ ] Cold launch with expired refresh token → splash → welcome (no flash of
      tab bar, no crash).
- [ ] Tap "Sign in" on welcome → land on `/login`. Tap "Create account" → land
      on `/sign-up`.
- [ ] On `/login` with active session (rare but possible: user navigates
      manually) → bounced to `/(app)` by `(auth)` gate.
- [ ] Deep link to `/(app)/messages/abc` with expired session → bounced to
      welcome (no 401-loop on the messages screen).
- [ ] Sign out from `(app)/profile` → land on welcome (gate handles redirect;
      no `router.replace` left in `profile.tsx`).
- [ ] Transient network error (API unreachable, not 401) does NOT bounce a
      session-having user to welcome — gate only fires on explicit auth
      failure.
- [ ] New Maestro flows `11-welcome-cold-launch.yaml` and
      `12-deep-link-expired-session.yaml` pass locally.
- [ ] Existing Maestro flows (`01-signup-verify-home`, `04-forgot-password-reset-login`,
      `08-cold-launch-session-restore`, `09-sign-out-clears-store`) still pass
      unchanged.
- [ ] No new top-level deps. No new components in `components/ui/`.
- [ ] `pnpm --filter @mlabs/mobile lint` and `pnpm --filter @mlabs/mobile typecheck`
      pass. `no-brand-string-literal` rule reports zero violations on welcome.tsx.
- [ ] Web preview (`pnpm --filter @mlabs/mobile web`) routes correctly:
      no stored tokens → welcome; in-memory mock session → home.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Welcome screen visual weight.** Locked as "wordmark + tagline + 2 CTAs",
  but should it include a hero illustration or just be type-led? Type-led
  matches the marketing site's hero (`apps/web/src/components/marketing/hero.tsx`)
  which is also illustration-free. Recommendation: type-led, no asset
  dependency.
- **Should `welcome.tsx` live in `(auth)/` or be a sibling of `(auth)` /
  `(app)`?** Inside `(auth)/` is simpler (one stack) but couples it to the
  auth layout. Outside (e.g. `app/welcome.tsx` as a sibling route) is more
  modular. Recommendation: keep inside `(auth)/` — the welcome screen *is*
  part of the unauthenticated flow.
- **CTA primary/secondary ordering.** Production-grade apps usually put
  "Create account" as the primary (most apps want signups), with "Sign in"
  as the secondary/outline. Confirm this is the right call vs putting "Sign
  in" primary (returning-user-first).
- **Should the `(app)` gate render a loading skeleton during `me.isPending`,
  or just return `null`?** `null` is fine on cold launch (splash covers) but
  on a session refetch (post-sign-out, post-token-rotation) returning `null`
  creates a blank frame. Recommendation: render `null` only when
  `me.isPending && !me.isFetched` (first load); on refetch, keep showing
  the existing tabs until the gate fires.
- **`meRequest()` error discrimination.** This plan calls for distinguishing
  401 from transient network failures. Worth doing as part of this plan or
  splitting to a follow-up? Recommendation: do it here — without it, the
  gate misfires on flaky networks and bounces session-having users to
  welcome, which is a worse regression than the current behavior.
- **Brand tagline length on welcome.** `brand.tagline` is currently
  "AI engineering with guardrails, conventions, and a paper trail" — long
  for a mobile welcome screen. Should welcome use a shortened tagline (new
  `brand.shortTagline` field) or render the full tagline with `numberOfLines`
  / wrapping? Recommendation: add `brand.shortTagline` (or `brand.taglineMobile`)
  to `packages/config/src/brand.ts` so forks can tune per-surface without
  truncation rules in the UI.
