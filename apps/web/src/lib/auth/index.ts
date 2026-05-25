// Transitional shim — wires env + db + email into @mlabs/auth/server's
// createAuth factory. Phase 5 (apps/web rewire) replaces this with a per-app
// composition root.

import { db } from "@/lib/db"
import { env } from "@/config/env"
import { logger } from "@/lib/logger"
import {
  sendPasswordResetEmail,
  sendVerifyEmail,
} from "@/lib/email"
import { createAuth } from "@mlabs/auth/server"

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

export const auth = createAuth({
  db,
  secret: env.BETTER_AUTH_SECRET,
  baseUrl,
  initialAdminEmail: env.INITIAL_ADMIN_EMAIL,
  isProduction: env.NODE_ENV === "production",
  email: {
    sendVerifyEmail: ({ to, name, verifyUrl }) =>
      sendVerifyEmail({ to, name, verifyUrl }),
    sendPasswordResetEmail: ({ to, name, resetUrl }) =>
      sendPasswordResetEmail({ to, name, resetUrl }),
  },
  logger: {
    info: (m, meta) => logger.info(m, meta),
    warn: (m, meta) => logger.warn(m, meta),
  },
})

export type Auth = typeof auth
