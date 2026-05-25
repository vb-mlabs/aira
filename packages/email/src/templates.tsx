import "server-only"

// Typed template wrappers — one per transactional email kind. Each function
// builds the matching React Email component, renders it to HTML + plaintext
// via @react-email/render, then hands the rendered bodies to the active
// driver. The public EmailTemplates interface (sendVerifyEmail,
// sendPasswordResetEmail, sendNotificationEmail) keeps stable shapes so
// BetterAuth + @mlabs/services call sites never need to know which provider
// is wired up underneath.
//
// Adding a new template:
//   1. Add a React component under templates/<name>.tsx
//   2. Add a typed wrapper here with a matching subject builder
//   3. Export the component from index.ts so the dev preview can render it

import { brand } from "@mlabs/config"
import { render } from "@react-email/render"
import { NotificationEmail } from "./templates/notification"
import { PasswordResetEmail } from "./templates/password-reset"
import { VerifyEmail } from "./templates/verify-email"
import type { EmailDriver } from "./types"

interface BaseSendOpts {
  to: string
}

export interface CreateTemplatesOptions {
  /** Read lazily so callers can swap drivers in tests via a getter. */
  getDriver: () => EmailDriver
  brandName: string
}

export interface EmailTemplates {
  sendVerifyEmail: (
    opts: BaseSendOpts & { name: string; verifyUrl: string },
  ) => Promise<void>
  sendPasswordResetEmail: (
    opts: BaseSendOpts & {
      name: string
      resetUrl: string
      expiresInMinutes?: number
    },
  ) => Promise<void>
  sendNotificationEmail: (
    opts: BaseSendOpts & {
      title: string
      body: string
      ctaLabel?: string
      ctaUrl?: string
    },
  ) => Promise<void>
}

export function createTemplates({
  getDriver,
  brandName,
}: CreateTemplatesOptions): EmailTemplates {
  const layoutChrome = {
    brandName,
    supportEmail: brand.supportEmail,
    legalEntity: brand.legalEntity,
  }

  return {
    async sendVerifyEmail(opts) {
      const tree = (
        <VerifyEmail
          {...layoutChrome}
          name={opts.name}
          verifyUrl={opts.verifyUrl}
        />
      )
      const [html, text] = await Promise.all([
        render(tree),
        render(tree, { plainText: true }),
      ])
      await getDriver().send({
        to: opts.to,
        subject: `Verify your ${brandName} email`,
        html,
        text,
        fromName: brandName,
      })
    },

    async sendPasswordResetEmail(opts) {
      const expiresInMinutes = opts.expiresInMinutes ?? 60
      const tree = (
        <PasswordResetEmail
          {...layoutChrome}
          name={opts.name}
          resetUrl={opts.resetUrl}
          expiresInMinutes={expiresInMinutes}
        />
      )
      const [html, text] = await Promise.all([
        render(tree),
        render(tree, { plainText: true }),
      ])
      await getDriver().send({
        to: opts.to,
        subject: `Reset your ${brandName} password`,
        html,
        text,
        fromName: brandName,
      })
    },

    async sendNotificationEmail(opts) {
      const tree = (
        <NotificationEmail
          {...layoutChrome}
          title={opts.title}
          body={opts.body}
          ctaLabel={opts.ctaLabel}
          ctaUrl={opts.ctaUrl}
        />
      )
      const [html, text] = await Promise.all([
        render(tree),
        render(tree, { plainText: true }),
      ])
      await getDriver().send({
        to: opts.to,
        subject: opts.title,
        html,
        text,
        fromName: brandName,
      })
    },
  }
}
