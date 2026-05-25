import "server-only"

// @mlabs/email — transactional email factory.
//
// Subpath imports:
//   - @mlabs/email             — createEmailClient orchestrator (server-only)
//   - @mlabs/email/types       — EmailDriver, SendArgs, SendResult (universal)
//   - @mlabs/email/url         — buildAuthUrl, buildAppLinkUrl (server-only)
//   - @mlabs/email/templates   — createTemplates factory (server-only)
//   - @mlabs/email/components  — Layout + Button primitives (for dev preview)
//   - @mlabs/email/templates/* — individual React Email components (for dev preview)
//   - @mlabs/email/drivers/*   — consoleDriver, createPostmarkDriver (server-only)

import { consoleDriver } from "./drivers/console"
import { createPostmarkDriver } from "./drivers/postmark"
import { createTemplates, type EmailTemplates } from "./templates"
import type { EmailDriver } from "./types"

export type { EmailDriver, SendArgs, SendResult } from "./types"
export type { EmailTemplates, CreateTemplatesOptions } from "./templates"
export { createTemplates } from "./templates"
export { consoleDriver } from "./drivers/console"
export {
  createPostmarkDriver,
  type PostmarkDriverOptions,
} from "./drivers/postmark"
export { buildAuthUrl, buildAppLinkUrl } from "./url"

export interface CreateEmailClientOptions {
  /** Postmark server token — when undefined/empty, falls back to console driver. */
  postmarkToken?: string | undefined
  /** Verified Postmark sender email (POSTMARK_FROM_EMAIL). Required if postmarkToken is set. */
  fromEmail?: string | undefined
  /** Branding shown in email headers/footers. */
  brandName: string
}

export interface EmailClient extends EmailTemplates {
  /** The active driver (postmark when configured, console otherwise). */
  driver: EmailDriver
  /**
   * Override the active driver. Tests use this to inject a recording driver;
   * `null` resets to the configured default.
   */
  setDriverForTesting(driver: EmailDriver | null): void
}

export function createEmailClient({
  postmarkToken,
  fromEmail,
  brandName,
}: CreateEmailClientOptions): EmailClient {
  const defaultDriver: EmailDriver =
    postmarkToken && fromEmail
      ? createPostmarkDriver({ token: postmarkToken, fromEmail })
      : consoleDriver
  let override: EmailDriver | null = null
  const getDriver = (): EmailDriver => override ?? defaultDriver
  const templates = createTemplates({ getDriver, brandName })

  return {
    ...templates,
    get driver() {
      return getDriver()
    },
    setDriverForTesting(driver) {
      override = driver
    },
  }
}
