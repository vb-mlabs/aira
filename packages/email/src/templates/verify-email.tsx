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
  /** Minutes until verifyUrl stops working. Rendered as "X hours" when a
   *  whole hour, else "X minutes". */
  expiresInMinutes: number
}

export function VerifyEmail({
  brandName,
  supportEmail,
  legalEntity,
  name,
  verifyUrl,
  expiresInMinutes,
}: VerifyEmailProps) {
  const greeting = name?.trim() ? name : "there"
  const expiryLabel = formatExpiry(expiresInMinutes)
  return (
    <Layout
      brandName={brandName}
      supportEmail={supportEmail}
      legalEntity={legalEntity}
      preview={`Verify your ${brandName} email to finish signing up (expires in ${expiryLabel})`}
    >
      <Text style={{ margin: "0 0 16px 0" }}>Hi {greeting},</Text>

      <Text style={{ margin: "0 0 24px 0" }}>
        Tap the button below to confirm this email address and finish setting
        up your {brandName} account. This link expires in {expiryLabel}.
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

// "120" → "2 hours"; "60" → "1 hour"; "45" → "45 minutes". Whole-hour
// values read more naturally as hours in the copy.
function formatExpiry(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} ${hours === 1 ? "hour" : "hours"}`
  }
  return `${minutes} minutes`
}
