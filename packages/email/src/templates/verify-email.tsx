// Sent by BetterAuth when a user signs up. Renders to HTML + plaintext via
// @react-email/render at send time — no Postmark hosted template required.

import { Section, Text } from "@react-email/components"
import { Button } from "../components/Button"
import { Layout } from "../components/Layout"
import { theme } from "../components/theme"

export interface VerifyEmailProps {
  brandName: string
  supportEmail: string
  legalEntity: string
  /** Recipient's display name; falls back to "there" if empty. */
  name: string
  /** Signed verify URL (built by buildAuthUrl). */
  verifyUrl: string
}

export function VerifyEmail({
  brandName,
  supportEmail,
  legalEntity,
  name,
  verifyUrl,
}: VerifyEmailProps) {
  const greeting = name?.trim() ? name : "there"
  return (
    <Layout
      brandName={brandName}
      supportEmail={supportEmail}
      legalEntity={legalEntity}
      preview={`Verify your ${brandName} email to finish signing up`}
    >
      <Text style={{ margin: "0 0 16px 0" }}>Hi {greeting},</Text>

      <Text style={{ margin: "0 0 24px 0" }}>
        Tap the button below to confirm this email address and finish setting
        up your {brandName} account.
      </Text>

      <Section style={{ padding: "8px 0 24px 0" }}>
        <Button href={verifyUrl}>Verify email</Button>
      </Section>

      <Text
        style={{
          color: theme.colors.mutedForeground,
          fontSize: theme.textSize.small,
          margin: "0 0 8px 0",
        }}
      >
        Or paste this link into your browser:
      </Text>
      <Text
        style={{
          color: theme.colors.mutedForeground,
          fontSize: theme.textSize.small,
          margin: 0,
          wordBreak: "break-all",
        }}
      >
        {verifyUrl}
      </Text>
    </Layout>
  )
}
