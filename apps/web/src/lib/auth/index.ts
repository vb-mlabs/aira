// Transitional shim — wires env + db + email into @aira/auth/server's
// createAuth factory. Phase 5 (apps/web rewire) replaces this with a per-app
// composition root.

import { db } from "@/lib/db"
import { env } from "@/config/env"
import { logger } from "@/lib/logger"
import {
  sendPasswordResetEmail,
  sendVerifyEmail,
} from "@/lib/email"
import { createAuth } from "@aira/auth/server"

// baseUrl fallback chain (Replit-aware):
//   1. BETTER_AUTH_URL (explicit override — production, CI, e2e)
//   2. https://$REPLIT_DEV_DOMAIN (Replit injects this on workspace start;
//      keeps BetterAuth cookies signed under the right host so the dev
//      preview at *.replit.dev can read them)
//   3. undefined (BetterAuth uses its own per-request inference)
//
// Without (2), the Replit preview workflow signs cookies under localhost
// and the browser silently drops them — sign-in appears to succeed but
// every subsequent request lands on /login. See docs/template/TEMPLATE.md
// lessons #20, #28.
const baseUrl =
  env.BETTER_AUTH_URL ??
  (env.REPLIT_DEV_DOMAIN ? `https://${env.REPLIT_DEV_DOMAIN}` : undefined)

// Always trust the local dev server. In production this list is empty —
// the baseUrl check alone is sufficient.
const trustedOrigins =
  env.NODE_ENV !== "production"
    ? [
        "http://localhost:3000",
        "http://localhost:5000",
        ...(env.REPLIT_DEV_DOMAIN
          ? [`https://${env.REPLIT_DEV_DOMAIN}`]
          : []),
      ]
    : undefined

export const auth = createAuth({
  db,
  secret: env.BETTER_AUTH_SECRET,
  baseUrl,
  trustedOrigins,
  initialAdminEmail: env.INITIAL_ADMIN_EMAIL,
  initialSuperAdminEmail: env.INITIAL_SUPER_ADMIN_EMAIL,
  email: {
    // Forward every field from the AuthEmailSender contract — including
    // expiresInMinutes, which controls the "expires in X" line in the
    // email copy. Dropping it here (as the previous {to, name, verifyUrl}
    // destructure did) makes the copy silently fall back to the wrapper's
    // default, so any future change to EMAIL_LINK_TTL_MINUTES would leave
    // the emails saying the old value. TS contravariance won't catch the
    // omission — the sender contract types check compatibility, not
    // whether individual params are consumed.
    sendVerifyEmail: (opts) => sendVerifyEmail(opts),
    sendPasswordResetEmail: (opts) => sendPasswordResetEmail(opts),
  },
  logger: {
    info: (m, meta) => logger.info(m, meta),
    warn: (m, meta) => logger.warn(m, meta),
  },
})

export type Auth = typeof auth
