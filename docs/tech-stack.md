# Tech Stack & Third-Party Dependencies

AIRA is a pnpm + Turborepo monorepo that ships a Next.js 16 web app and an Expo
54 mobile app off a shared TypeScript service layer. Both clients speak to the
same versioned REST surface (`/api/v1/*`) built on `defineOperation` + Zod, so
web (React 19, Tailwind v4, Base UI / shadcn) and mobile (React Native 0.81,
NativeWind, expo-router) share validators, error contracts, and typed fetch
plumbing end-to-end. Persistence is Neon Postgres via Drizzle ORM behind an
advisory-locked migrate script; auth is Better Auth (with the Expo companion
for mobile); transactional email is Postmark via React Email; file uploads go
to Replit Object Storage; payments and webhooks run through Stripe; server-side
push fan-out uses the Expo Push service; mobile ships and updates via EAS
Build + EAS Update (OTA). Design tokens live in `packages/config` (OKLCH) and
are mirrored into `apps/web/src/app/globals.css` and the generated mobile
Tailwind config so brand changes propagate to web, mobile, and email at once.

## Monorepo shape
- **pnpm 10 workspaces + Turborepo** — `apps/web` (Next.js), `apps/mobile` (Expo), 8 shared `packages/*` (validators, db, auth, email, api, services, ui-web, config).
- **TypeScript 5.9** across the board; **ESLint 9** + **Prettier**; **Lefthook** pre-commit; **Vitest 4** for unit; **Playwright** for web e2e; **Maestro** for mobile e2e.

## Web app (`apps/web`)
- **Next.js 16** (App Router) on **React 19.2**.
- **Tailwind CSS v4** (`@tailwindcss/postcss`) + **shadcn** primitives on **Base UI React** (`@base-ui/react`).
- Forms: **react-hook-form** + **@hookform/resolvers** + **Zod 4**.
- UX bits: **lucide-react** icons, **sonner** toasts, **next-themes**, **react-dropzone**, **react-easy-crop**, **@dnd-kit** (core/sortable/utilities), **libphonenumber-js**, **tw-animate-css**, **class-variance-authority**, **tailwind-merge**, **clsx**.
- Server jobs: **node-cron**.
- Image processing: **sharp** (optional).

## Mobile app (`apps/mobile`)
- **Expo SDK 54** on **React Native 0.81** / **React 19.1**.
- **expo-router 6**, **NativeWind 4** (+ Tailwind 3 config), **@tanstack/react-query 5**.
- Expo modules: constants, font, image-picker, linking, notifications, secure-store, splash-screen, status-bar, system-ui, **expo-updates** (OTA).
- Native: **react-native-gesture-handler**, **reanimated 4**, **safe-area-context**, **screens**, **svg**, **react-native-web**, **@react-native-async-storage/async-storage**, **@expo-google-fonts** (Cormorant Garamond, Lato), **@expo/vector-icons**, **@expo/react-native-action-sheet**.
- Auth: **@better-auth/expo** + **better-auth** with **whatwg-fetch** polyfill.

## Shared packages
- **@aira/db** — **Drizzle ORM 0.45** + **drizzle-zod**, **@neondatabase/serverless**, **ws**; advisory-locked migrate script.
- **@aira/auth** — **Better Auth 1.6** + **jose** for JWT.
- **@aira/email** — **@react-email/components** + **@react-email/render**, **Postmark 4** driver.
- **@aira/services** — **Drizzle**, **stripe 22**, **expo-server-sdk** (push fan-out).
- **@aira/api** — pure Zod wrappers around `defineOperation`; typed fetch client + `apiServerFetch` in-process invoker.
- **@aira/validators** — Zod-only schemas shared web + mobile.
- **@aira/config** — design tokens (OKLCH), brand, tailwind preset, env factory (**@t3-oss/env-nextjs**).
- **@aira/ui-web** — shadcn-based primitives.

## Third-party services (env-configured)
| Service | Purpose | Env var |
|---|---|---|
| **Neon Postgres** | Primary database (serverless driver) | `DATABASE_URL` |
| **Better Auth** | Sessions, sign-in, password reset, bearer for mobile | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| **Postmark** | Transactional email | `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL` |
| **Replit Object Storage** | User uploads (avatars, payment evidence, etc.) | `REPLIT_OBJECT_STORAGE_BUCKET_ID` |
| **Stripe** | Checkout, subscriptions, webhook at `/api/stripe/webhook` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Expo Push (EAS)** | Server-side push broadcasts | `EXPO_ACCESS_TOKEN` (optional) |
| **Google Maps Places** | Admin address autocomplete (optional) | `GOOGLE_MAPS_API_KEY` |
| **EAS Build / Update** | Mobile release + OTA runway | EAS project `21065081-2afd-43d4-aef7-7ce10de55a8b` |
| **Anthropic / Claude Code** | Dev-time agent workflow | `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` |

## Infra / hosting notes
- **Replit** hosts the dev workspace + web app; **Neon** for Postgres; **EAS** for mobile builds & OTA updates; apex-only outbound URL `airabynisarga.com` (bundle `com.airabynisarga.app`).
