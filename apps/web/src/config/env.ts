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
    // None yet.
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
    EXPO_SCHEME: process.env.EXPO_SCHEME,
    REPLIT_DEV_DOMAIN: process.env.REPLIT_DEV_DOMAIN,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  },
  // During first-deploy / fork, secrets may not be set yet. Skip validation
  // unless explicitly requested. Set SKIP_ENV_VALIDATION=1 for build steps
  // that don't have access to secrets.
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION || process.env.npm_lifecycle_event === "lint",
})
