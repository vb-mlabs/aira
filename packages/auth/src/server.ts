import "server-only"

// Better Auth instance factory. Per-app composition roots call createAuth()
// with their env + db + email wiring; the returned `auth` object is what API
// routes hit (auth.api.getSession, auth.handler, etc.).
//
// Email/password is enabled with email verification REQUIRED — users must
// click the verify link before login is allowed. Email send is inline (no
// jobs runner): if the email provider fails, the auth flow
// surfaces the error to the caller — UI shows a retry-able message.

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { bearer } from "better-auth/plugins/bearer"
import type { Database } from "@aira/db/client"
import { createAdminBootstrapHook } from "./hooks/admin-bootstrap"
import { createBanCheckHook } from "./hooks/ban-check"
import { createSuperAdminBootstrapHook } from "./hooks/super-admin-bootstrap"
import { rewriteAuthEmailUrl } from "./rewrite-auth-email-url"

export interface AuthLogger {
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
}

export interface AuthEmailSender {
  sendVerifyEmail: (opts: {
    to: string
    name: string
    verifyUrl: string
  }) => Promise<void>
  sendPasswordResetEmail: (opts: {
    to: string
    name: string
    resetUrl: string
  }) => Promise<void>
}

export interface CreateAuthOptions {
  db: Database
  /** HMAC secret. Optional at the type level to match better-auth's
   *  permissive shape and the env validator (BETTER_AUTH_SECRET is optional
   *  so test/dev environments can boot without it). */
  secret?: string | undefined
  baseUrl?: string
  /** Extra origins to trust in addition to baseUrl — e.g. localhost ports in dev. */
  trustedOrigins?: string[]
  /** Optional. Auto-promotes a user with this email to "admin" on signup. */
  initialAdminEmail?: string | undefined
  /** Optional. Auto-promotes a user with this email to "super_admin" on
   *  signup. Must differ from initialAdminEmail when both are set
   *  (enforced at boot in apps/web/src/config/env.ts). */
  initialSuperAdminEmail?: string | undefined
  email: AuthEmailSender
  /** Optional logger. Defaults to console. */
  logger?: AuthLogger
}

export function createAuth({
  db,
  secret,
  baseUrl,
  trustedOrigins,
  initialAdminEmail,
  initialSuperAdminEmail,
  email,
  logger,
}: CreateAuthOptions) {
  const log: AuthLogger =
    logger ??
    ({
      info: (m, meta) => console.info(m, meta),
      warn: (m, meta) => console.warn(m, meta),
    } satisfies AuthLogger)

  const beforeSessionCreate = createBanCheckHook({ db })
  // Two single-purpose bootstrap hooks composed into one after-create
  // callback. Order is irrelevant: env validation guarantees the two emails
  // differ when both are set, so at most one of the inner hooks does work
  // per signup.
  const promoteAdmin = createAdminBootstrapHook({
    db,
    initialAdminEmail,
    logger: log,
  })
  const promoteSuperAdmin = createSuperAdminBootstrapHook({
    db,
    initialSuperAdminEmail,
    logger: log,
  })
  const afterUserCreate = async (user: { id: string; email: string }) => {
    await promoteAdmin(user)
    await promoteSuperAdmin(user)
  }

  const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    secret,
    baseURL: baseUrl,
    trustedOrigins,

    // Phase 5.5: enable `Authorization: Bearer <session-token>` transport.
    // Mobile (Expo) cannot use cookies, so it sends the session token in the
    // Authorization header. Existing cookie behavior on web is unchanged.
    plugins: [bearer()],

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        // Rewrite Better Auth's API-prefixed URL so iOS Universal Links
        // (`/reset-password*`) can catch the tap on-device. See
        // rewrite-auth-email-url.ts + .mstack/debug/2026-07-27-1200-auth-emails-open-web/report.md.
        await email.sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl: rewriteAuthEmailUrl(url),
        })
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        // Rewrite to /verify-email so Universal Links can catch the tap
        // on-device. See rewrite-auth-email-url.ts.
        await email.sendVerifyEmail({
          to: user.email,
          name: user.name,
          verifyUrl: rewriteAuthEmailUrl(url),
        })
      },
    },

    // Sessions live ~7 days, refresh on every request within the cookie's
    // lifetime.
    //
    // additionalFields.last_activity_at is the sliding idle-timeout signal
    // for admin sessions — Better Auth's updateAge is write-coalescing so
    // session.updatedAt isn't a reliable last-activity timestamp. The
    // requireAdmin() guard reads + bumps this column directly. input:false
    // so clients can't game it via the update-user API.
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      additionalFields: {
        last_activity_at: {
          type: "date",
          required: false,
          input: false,
        },
      },
    },

    user: {
      changeEmail: {
        enabled: true,
        // Send confirmation to the CURRENT verified address — the link in
        // this email completes the swap to the new email. Protects against
        // an attacker with a leaked session: they can't move the account to
        // an email they control without also controlling the old inbox.
        sendChangeEmailConfirmation: async ({ user, url }) => {
          // Same rewrite as sendVerificationEmail — change-email reuses
          // Better Auth's verify token pattern so the URL shape and
          // Universal Link concern are identical.
          await email.sendVerifyEmail({
            to: user.email,
            name: user.name,
            verifyUrl: rewriteAuthEmailUrl(url),
          })
        },
      },
      // W8 — admin role + ban state as Better Auth additionalFields.
      // input: false blocks the update-user API from accepting these from
      // the client, so users cannot self-promote or self-unban via the
      // standard auth surface. All mutations go through features/admin's
      // server actions, which require requireAdmin().
      additionalFields: {
        role: {
          type: "string",
          required: false,
          // Must match the user.role pgEnum default. Sprint 1 migrated from
          // "user" -> "end_user"; Better Auth uses this defaultValue when
          // inserting new users via the sign-up handler.
          defaultValue: "end_user",
          input: false,
        },
        banned_at: {
          type: "date",
          required: false,
          input: false,
        },
        banned_reason: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },

    databaseHooks: {
      session: { create: { before: beforeSessionCreate } },
      user: { create: { after: afterUserCreate } },
    },
  })

  return auth
}

export type Auth = ReturnType<typeof createAuth>
