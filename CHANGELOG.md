# Changelog

Notable changes to the MLabs template.

## [Unreleased]

### Phase 5.5 — Expo mobile scaffold (in flight)

Adds an Expo Router mobile app under `/mobile` covering sign-up, login, password reset, profile, avatar, messages, notifications. Mobile shares auth (bearer + JWT refresh), schemas (pure-Zod barrel), email pipeline, and design tokens with the existing Next.js web app. Replaces the prior Natively-wrapper strategy (see `docs/decisions/0004-expo-over-natively.md`).

**Lane A — auth (`481a48d`)**
- Better Auth `bearer` plugin enabled — `Authorization: Bearer <session-token>` accepted on every `/api/*` route alongside cookies. Web behavior unchanged.
- New `src/lib/auth/jwt.ts`: HS256 JWT signing/verification with 1h TTL, issuer-scoped (`mlabs-mobile`). Stateless verify (no DB hit per call).
- New `src/app/api/auth/refresh/route.ts`: issues a 1h access JWT in exchange for a valid Better Auth session. Returns 403 if user is banned (delete session row → block new refresh).
- `getSession()` updated: tries JWT → Better Auth bearer → cookie, in that order. Falls through cleanly on invalid JWT.

**Lane B — server lib (`a9cbdb1`)**
- New `src/lib/schemas/` barrel: pure-Zod, no Drizzle. ESLint rule `mlabs/no-drizzle-in-schemas` enforces the boundary.
- `ApiErrorResponse` Zod schema + `apiError()` server helper: locked wire format `{ error: { code, message, field? } }`. All `/api/*` routes refactored.
- `AuditMeta.client: "web" | "mobile"` union extension. Derived from `X-Client` header via `clientFromHeaders()`. Existing callers compile unchanged (defaults to `"web"`).
- `src/lib/email/url.ts`: `buildAuthUrl()` / `buildAppLinkUrl()` helpers. Email templates refactored to use them.
- DB migration `0005_add_user_notification_timestamps.sql`: adds `users.notifications_updated_at` + `users.messages_updated_at`, populated by INSERT triggers on `notifications` and `messages` (atomic, race-safe).
- Conditional GET (If-Modified-Since / ETag) on `/api/notifications/unread-count` + `/api/messages/conversations`.

**Lane C — mobile scaffold (`0a2a462` + integration `b9bab0d`)**
- `/mobile` Expo app: Expo Router, NativeWind v4, `@tanstack/react-query`, `expo-secure-store`, `@better-auth/expo` (peer-resolved with `--legacy-peer-deps` pending Expo SDK 52+).
- 11 screens: sign-up, login, forgot-password, reset-password, verify, check-email (post-signup), home, profile (iOS Settings pattern), messages inbox + thread, notifications.
- 8 mobile primitives matching shadcn API: Button, Input, Card, Sheet, Toast, Dialog, Avatar, Skeleton.
- 3 monochrome SVG illustrations using `currentColor` for empty states (inbox, notifications, no-results).
- `mobile/lib/api/client.ts`: fetch wrapper with bearer + `X-Client: mobile` + 401 auto-refresh (in-flight dedup).
- `scripts/gen-mobile-tailwind.ts`: generates `mobile/tailwind.config.js` from `src/config/design.ts`. DO-NOT-EDIT header + `--check` flag + pre-commit hook.
- 11 Maestro flow YAMLs under `mobile/.maestro/` (local-only; CI promotion deferred).

**Lane D — deep links + handover + contrast (`b4eb926`)**
- `public/.well-known/apple-app-site-association` + `assetlinks.json`: placeholder Universal Links / App Links manifests, served with `application/json` content type via `src/app/.well-known/[file]/route.ts`.
- `scripts/verify-deeplinks.ts`: local-only validator that fetches AASA + assetlinks, checks JSON shape, bundle/team/SHA placeholders. Run pre-submission via `npm run verify:deeplinks`.
- `scripts/check-contrast.ts`: WCAG-AA build-time check on `src/config/design.ts` color pairs. Pre-commit hook gates every commit. 14 token pairs covered.
- `HANDOVER.md.template` + `docs/handover/eas-submission.md`: per-fork production checklist (Apple Developer, Play Console, EAS Submit, deep-link plumbing).

**Palette — WCAG AA (Pass 6, locked via `check-contrast`)**
Palette tightened to pass `scripts/check-contrast.ts` against the design review's locked thresholds:
- Light `mutedForeground` L=0.556 → 0.48 (4.34:1 → 5.99:1)
- Light `border` / `input` L=0.922 → 0.64 (1.26:1 → 3.14:1)
- Light `ring` L=0.708 → 0.62 (2.59:1 → 3.64:1)
- Light `success` L=0.62 → 0.48 (3.25:1 → 5.81:1)
- Dark `border` alpha 10% → 35% (1.25:1 → 3.14:1)
- Dark `input` alpha 15% → 40% (1.47:1 → 3.77:1)

**Lane E — final integration**
- New `requireUserJSON()` helper in `src/lib/auth/server.ts` — returns 401 JSON instead of `redirect("/login")` for mobile-accessible routes. Migrated `/api/avatar`, `/api/messages/*` to use it.
- New `/api/profile` PATCH (name) + DELETE (anonymize), `/api/profile/password` POST (change password), `/api/notifications/mark-all-read` POST. Server-side mirror of Server Actions for mobile reach.
- Mobile auth API rewritten to use Better Auth's canonical paths (`/api/auth/sign-up/email`, `/api/auth/sign-in/email`, `/api/auth/request-password-reset`, `/api/auth/send-verification-email`, `/api/auth/get-session`). Sign-in flow now chains session-token → `/api/auth/refresh` → JWT in one step.
- `mobile/lib/api/client.ts` refresh path corrected: sends refresh as `Authorization: Bearer`, expects `{ accessToken, expiresIn, tokenType }` (no refresh-token rotation — Better Auth's session.updateAge advances expiry server-side).
- `tests/audit-meta.type.test.ts`: 9 compile-time type assertions for `AuditMeta` + `AuditOpts` contract via `expect-type`.

**Test count:** 173/173 → 182/182 across 22 files (Lane E added 9 type tests).

**Mobile-server contract caveats:**
- `@better-auth/expo@1.6.10` declares peer on `expo-constants >= 17` but Expo SDK 51 ships `~16.0.2` — install requires `--legacy-peer-deps`. Bump Expo SDK in a follow-up.
- `mobile/lib/schemas/*` deliberately mirrors `src/lib/schemas/*` (Metro can't cross the `src/` → `mobile/` boundary). A future `shared/` package would dedupe.
- `mobile/lib/theme/tokens.ts` hand-mirrors `src/config/design.ts` OKLCH values as hex equivalents for runtime RN consumption (SVG strokes, splash). Recomputed whenever palette shifts.

## [v1.0.0] — W1-W8 baseline (`124b3a4`, 2026-05-09)

Initial template — see PR #1 for scope. Auth, email, lib primitives, profile, avatar, notifications, messages, admin.
