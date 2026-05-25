// Sent by BetterAuth when a user requests a password reset. Includes the
// expiry window in copy so the recipient knows the link is short-lived.

import { Section, Text } from "@react-email/components"
import { Button } from "../components/Button"
import { Layout } from "../components/Layout"
import { theme } from "../components/theme"

export interface PasswordResetEmailProps {
  brandName: string
  supportEmail: string
  legalEntity: string
  name: string
  resetUrl: string
  expiresInMinutes: number
}

export function PasswordResetEmail({
  brandName,
  supportEmail,
  legalEntity,
  name,
  resetUrl,
  expiresInMinutes,
}: PasswordResetEmailProps) {
  const greeting = name?.trim() ? name : "there"
  return (
    <Layout
      brandName={brandName}
      supportEmail={supportEmail}
      legalEntity={legalEntity}
      preview={`Reset your ${brandName} password (expires in ${expiresInMinutes} min)`}
    >
      <Text style={{ margin: "0 0 16px 0" }}>Hi {greeting},</Text>

      <Text style={{ margin: "0 0 24px 0" }}>
        We received a request to reset the password for your {brandName}{" "}
        account. Tap the button below to choose a new one. This link expires
        in {expiresInMinutes} minutes.
      </Text>

      <Section style={{ padding: "8px 0 24px 0" }}>
        <Button href={resetUrl}>Reset password</Button>
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
          margin: "0 0 24px 0",
          wordBreak: "break-all",
        }}
      >
        {resetUrl}
      </Text>

      <Text
        style={{
          color: theme.colors.mutedForeground,
          fontSize: theme.textSize.small,
          margin: 0,
        }}
      >
        Didn't request this? You can safely ignore this email — your password
        won't change.
      </Text>
    </Layout>
  )
}
