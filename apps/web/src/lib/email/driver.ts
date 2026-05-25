// Transitional shim — binds @mlabs/email driver factories to the app's env
// so existing callers can keep importing getEmailDriver / _setDriverForTesting
// from this path. Phase 5 (apps/web rewire) replaces this with a per-app
// composition root that owns the createEmailClient() call.

import "server-only"
import { env } from "@/config/env"
import { consoleDriver } from "@mlabs/email/drivers/console"
import { createPostmarkDriver } from "@mlabs/email/drivers/postmark"
import type { EmailDriver } from "@mlabs/email/types"

let _driver: EmailDriver | null = null

export function getEmailDriver(): EmailDriver {
  if (_driver) return _driver
  _driver =
    env.POSTMARK_SERVER_TOKEN && env.POSTMARK_FROM_EMAIL
      ? createPostmarkDriver({
          token: env.POSTMARK_SERVER_TOKEN,
          fromEmail: env.POSTMARK_FROM_EMAIL,
        })
      : consoleDriver
  return _driver
}

/** Test-only: override the active driver. Resets after the test. */
export function _setDriverForTesting(driver: EmailDriver | null): void {
  _driver = driver
}
