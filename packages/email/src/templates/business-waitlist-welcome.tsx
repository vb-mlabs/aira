// Sent by /api/v1/business-waitlist after a successful new-business signup.
//
// Sets the expectation that someone from the team will reach out via the
// business owner's preferred contact channel. Deliberately brief — no hard
// timeline promised, no marketing drip.

import { Text } from "@react-email/components"
import { Layout } from "../components/Layout"
import { theme } from "../components/theme"

export interface BusinessWaitlistWelcomeEmailProps {
  brandName: string
  supportEmail: string
  legalEntity: string
}

export function BusinessWaitlistWelcomeEmail({
  brandName,
  supportEmail,
  legalEntity,
}: BusinessWaitlistWelcomeEmailProps) {
  return (
    <Layout
      brandName={brandName}
      supportEmail={supportEmail}
      legalEntity={legalEntity}
      preview={`Thanks for your interest in listing your business on ${brandName}`}
    >
      <Text style={{ margin: "0 0 16px 0" }}>Thanks for reaching out.</Text>

      <Text style={{ margin: "0 0 16px 0" }}>
        We've received your listing request for {brandName}. A member of our
        team will be in touch via your preferred contact channel shortly.
      </Text>

      <Text style={{ margin: "0 0 16px 0" }}>
        In the meantime, if you have any questions you can reply to this email
        or reach us at{" "}
        <a href={`mailto:${supportEmail}`} style={{ color: theme.colors.primary }}>
          {supportEmail}
        </a>
        .
      </Text>

      <Text style={{ margin: "0 0 24px 0" }}>
        We look forward to listing your business.
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
