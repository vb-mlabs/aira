// Sent by /api/v1/waitlist after a successful new-email signup.
//
// Single-opt-in for MVP — no "confirm by clicking this link" flow. Just a
// thank-you note that sets the expectation: one more email, the day AIRA
// opens in Atlanta, then nothing.
//
// No CTA button on purpose — there's nothing to click yet. The app isn't
// in stores, the marketing page is the only public surface, and we don't
// want to manufacture engagement for engagement's sake.

import { Text } from "@react-email/components"
import { Layout } from "../components/Layout"
import { theme } from "../components/theme"

export interface WaitlistWelcomeEmailProps {
  brandName: string
  supportEmail: string
  legalEntity: string
}

export function WaitlistWelcomeEmail({
  brandName,
  supportEmail,
  legalEntity,
}: WaitlistWelcomeEmailProps) {
  return (
    <Layout
      brandName={brandName}
      supportEmail={supportEmail}
      legalEntity={legalEntity}
      preview={`You're on the ${brandName} waitlist — see you in Atlanta soon`}
    >
      <Text style={{ margin: "0 0 16px 0" }}>Welcome.</Text>

      <Text style={{ margin: "0 0 16px 0" }}>
        You're on the {brandName} waitlist. We'll email you exactly once
        more &mdash; the day {brandName} opens in Atlanta.
      </Text>

      <Text style={{ margin: "0 0 16px 0" }}>
        Until then, no spam, no resale, no marketing drip. Just one email,
        when it's time.
      </Text>

      <Text style={{ margin: "0 0 24px 0" }}>
        Thanks for being early.
      </Text>

      <Text
        style={{
          color: theme.colors.mutedForeground,
          fontSize: theme.textSize.small,
          margin: 0,
          fontStyle: "italic",
        }}
      >
        &mdash; The {brandName} team at {legalEntity}
      </Text>
    </Layout>
  )
}
