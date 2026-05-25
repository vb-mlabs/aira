# 0004 — Expo replaces Natively for mobile

**Status:** accepted
**Date:** 2026-05-11
**Replaces:** the original "Native mobile codebase — Natively wraps the responsive web app" strategy
**Supersedes:** N/A
**Related:** the original "monorepo rejected" decision — partial carve-out for `/mobile` sibling app

## Context

The v1 strategy was to ship one responsive Next.js web app and wrap it for iOS/Android via Natively. After W1–W8 shipped, the team revisited this decision before Phase 6 (skills) and Phase 7 (pre-ship).

Two motivations to change course:

1. **Real native ergonomics:** Expo gives proper native gesture handling, native keyboard behavior, native scroll inertia, native sheet/modal presentation, push notification support — things a webview wrapper can only approximate. MLabs projects ship to the App Store and Play Store; Natively wrappers reliably score lower on the human-feel review criteria.
2. **One codebase shared with web:** Expo + React Native lets us share auth, schemas, design tokens, email pipeline, and storage adapters with the existing Next.js app. The wrapper approach shares nothing — every change is a re-wrap.

## Decision

Adopt **Expo Router + React Native + NativeWind** as the mobile codebase, in a sibling `/mobile` folder inside this repo. Drop Natively.

The /mobile app shares with the Next.js web app:
- Better Auth (via `@better-auth/expo` plugin with bearer token + refresh token rotation)
- `src/config/design.ts` design tokens (generated into mobile/tailwind.config.js by `scripts/gen-mobile-tailwind.ts`)
- `src/lib/schemas/` pure-Zod barrel (no Drizzle imports; ESLint-guarded)
- `src/lib/email/url.ts` URL helpers
- All REST endpoints under `src/app/api/*`
- `src/lib/db/audit.ts` audit log (extended with `client: 'web' | 'mobile'` field)

The /mobile app does NOT share:
- React component implementations (web uses shadcn/ui; mobile builds matching primitives in `mobile/components/ui/`)
- Data fetching (web uses Server Actions/RSC; mobile uses `@tanstack/react-query`)
- Build pipeline (mobile has its own `package.json`, Metro bundler, EAS config)

## Consequences

### Positive

- Native-feel UX on iOS and Android without a webview shim
- Single design-system source of truth (`src/config/design.ts`); brand change touches one file + runs `npm run gen:mobile-tw`
- Auth + emails + audit work identically across platforms
- Push notifications (deferred to v1.1) become a real possibility — Natively wrappers can't do this cleanly

### Negative

- **Innovation token spend:** Expo + NativeWind v4 + Better Auth bearer + Maestro + EAS = 4–5 new moving parts on top of the existing 3-token v1. Acknowledged trade-off, not mitigated.
- **Per-fork mobile setup:** each fork needs Apple Developer ($99/yr), Google Play ($25 one-time), bundle ID, signing certs, App Store Connect setup. Documented in `HANDOVER.md.template`; not template responsibility.
- **CI complexity:** Maestro E2E suite runs **locally only** in v1 (TODOS.md #2 tracks promotion to CI when a regression slips).
- **Monorepo-lite:** `/mobile` is a sibling Node project in the same git repo. No turborepo, no workspaces. Imports across the boundary use relative paths. Partially walks back the original "monorepo rejected" decision.

## Alternatives considered

| Option | Why rejected |
|---|---|
| Natively wrapper (the original path) | Lower-quality native feel; can't share schemas/auth/audit; every change is a re-wrap |
| Capacitor / Cordova webview wrapper | Same issues as Natively; worse tooling story than Expo |
| React Native CLI (no Expo) | Loses Expo Router, EAS, expo-secure-store, image-picker, etc. — months of reinvention |
| Tamagui or react-native-unistyles for styling | Different mental model from web Tailwind; breaks the "edit `src/config/design.ts`, brand both apps" promise |
| NativeWind v5 (Tailwind v4-compatible) | Pre-1.0; reported migration pain on GitHub discussions; not boring enough for a template that needs to age |

## Mobile-specific scope locked in Phase 5.5

Sign-up, login, password reset, email verification, profile, avatar upload, messages (1:1 + polling), notifications (polling).

Out of scope for v1: Expo Push, biometric auth, offline message queue, mobile admin UI, multi-tenancy, OAuth/magic-link providers (off by default same as web).

## See also

- `docs/decisions/0005-conditional-get-load-math.md` — server-side load implications
