// Generic notification email — used by features/notifications when a row
// should also fan out via email. The title + body are caller-provided; the
// CTA is optional.

import { Heading, Section, Text } from "@react-email/components"
import { Button } from "../components/Button"
import { Layout } from "../components/Layout"

export interface NotificationEmailProps {
  brandName: string
  supportEmail: string
  legalEntity: string
  title: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
}

export function NotificationEmail({
  brandName,
  supportEmail,
  legalEntity,
  title,
  body,
  ctaLabel,
  ctaUrl,
}: NotificationEmailProps) {
  const showCta = Boolean(ctaLabel && ctaUrl)
  return (
    <Layout
      brandName={brandName}
      supportEmail={supportEmail}
      legalEntity={legalEntity}
      preview={title}
    >
      <Heading
        as="h1"
        style={{
          fontSize: "20px",
          fontWeight: 700,
          letterSpacing: "-0.01em",
          margin: "0 0 16px 0",
        }}
      >
        {title}
      </Heading>

      <Text style={{ margin: "0 0 24px 0", whiteSpace: "pre-wrap" }}>
        {body}
      </Text>

      {showCta && ctaUrl && ctaLabel ? (
        <Section style={{ padding: "8px 0 0 0" }}>
          <Button href={ctaUrl}>{ctaLabel}</Button>
        </Section>
      ) : null}
    </Layout>
  )
}
