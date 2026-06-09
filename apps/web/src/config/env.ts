// Boot-time env validation. App refuses to start with bad/missing env.
// Add new variables here as they're introduced; never use process.env directly
// in app code (an ESLint rule will eventually enforce this).

import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Database (Neon Postgres)
    DATABASE_URL: z.string().url().optional(),

    // Better Auth — added in W2
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_URL: z.string().url().optional(),

    // Postmark — added in W3
    POSTMARK_SERVER_TOKEN: z.string().optional(),
    POSTMARK_FROM_EMAIL: z.string().email().optional(),

    // Replit Object Storage — added in W4
    REPLIT_OBJECT_STORAGE_BUCKET_ID: z.string().optional(),

    // Admin bootstrap — added in W8. When this email signs up (Better Auth
    // user.create.after hook), role auto-promotes to "admin". Set once per
    // fork in the deploy env; ignored if unset. Treat as a write-once value:
    // after the first admin exists, subsequent promotions use the admin UI.
    INITIAL_ADMIN_EMAIL: z.string().email().optional(),

    // Super-admin bootstrap — Sprint 1. Same pattern as INITIAL_ADMIN_EMAIL
    // but promotes to "super_admin" instead. Must differ from
    // INITIAL_ADMIN_EMAIL when both are set (refined at the schema top
    // level). super_admin subsumes admin perms and can promote/demote other
    // admins from the admin UI (super-admin-only screens added in a later
    // sprint).
    INITIAL_SUPER_ADMIN_EMAIL: z.string().email().optional(),

    // Phase 5.5 — Expo custom URL scheme for in-email deep links. When set,
    // emails surface `scheme://path` links so a tap from Mail opens the
    // installed Expo app directly. When unset (web-only fork), buildAppLinkUrl
    // falls back to BETTER_AUTH_URL so the email opens the browser.
    EXPO_SCHEME: z.string().optional(),

    // Replit dev domain (Replit-injected). Set automatically by Replit's
    // workspace runtime to the public preview host (e.g. `xxx.replit.dev`).
    // Used as a fallback when BETTER_AUTH_URL is unset (so cookies sign under
    // the right baseUrl) and to populate trustedOrigins in the CORS
    // middleware for cross-port Expo web dev. Unset outside Replit.
    REPLIT_DEV_DOMAIN: z.string().optional(),

    // Stripe — added in template hardening (2026-05-23). The template ships
    // the generic webhook idempotency + dispatcher; forks add their event
    // handlers + provision the webhook endpoint via `pnpm stripe:webhook-setup`
    // (once that script lands). `.optional()` so the template still boots
    // without Stripe configured.
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
  },
  client: {
    // Public env vars must be prefixed NEXT_PUBLIC_
    // Google Maps Places API key — admin address autocomplete (F27).
    // Optional: when unset, PlacesAddressInput falls back to a plain text input.
    // Ensure the key is restricted to HTTP referrers before setting in production.
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    POSTMARK_FROM_EMAIL: process.env.POSTMARK_FROM_EMAIL,
    REPLIT_OBJECT_STORAGE_BUCKET_ID: process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID,
    INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL,
    INITIAL_SUPER_ADMIN_EMAIL: process.env.INITIAL_SUPER_ADMIN_EMAIL,
    EXPO_SCHEME: process.env.EXPO_SCHEME,
    REPLIT_DEV_DOMAIN: process.env.REPLIT_DEV_DOMAIN,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  // During first-deploy / fork, secrets may not be set yet. Skip validation
  // unless explicitly requested. Set SKIP_ENV_VALIDATION=1 for build steps
  // that don't have access to secrets.
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION || process.env.npm_lifecycle_event === "lint",
})

// Cross-field validation. INITIAL_ADMIN_EMAIL and INITIAL_SUPER_ADMIN_EMAIL
// must differ when both are set — if they were equal, both bootstrap hooks
// would fire on the same signup and the resulting role would depend on hook
// invocation order. Distinct emails make the promotion deterministic.
//
// `typeof window === "undefined"` guard so the check only runs server-side.
// t3-env throws "Attempted to access a server-side environment variable on
// the client" when server keys are read in a jsdom-style environment
// (vitest's apps/web setup), and reaching the env.INITIAL_*_EMAIL access
// is itself enough to trip that. The server guarantees we get here at boot
// via the @/lib/db / @/lib/auth import chains.
const _skipEnvValidation =
  !!process.env.SKIP_ENV_VALIDATION ||
  process.env.npm_lifecycle_event === "lint"
if (typeof window === "undefined" && !_skipEnvValidation) {
  const adminEmail = env.INITIAL_ADMIN_EMAIL
  const superAdminEmail = env.INITIAL_SUPER_ADMIN_EMAIL
  if (
    adminEmail &&
    superAdminEmail &&
    adminEmail.toLowerCase() === superAdminEmail.toLowerCase()
  ) {
    throw new Error(
      "INITIAL_ADMIN_EMAIL and INITIAL_SUPER_ADMIN_EMAIL must be different. " +
        "Setting them equal would race the two bootstrap hooks on the same " +
        "signup — final role would depend on hook order. Use distinct emails.",
    )
  }
}
