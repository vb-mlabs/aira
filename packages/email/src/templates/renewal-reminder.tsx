import { Heading, Section, Text, Hr } from "@react-email/components"
import { Button } from "../components/Button"
import { Layout } from "../components/Layout"
import { theme } from "../components/theme"

export interface RenewalReminderRow {
  businessName: string
  planName: string | null
  endDate: string
  daysRemaining: number
}

export interface RenewalReminderEmailProps {
  brandName: string
  supportEmail: string
  legalEntity: string
  businesses: RenewalReminderRow[]
  adminUrl: string
  /** Header + preview label, e.g. "Expiring in 30 days". F17 sends one
   *  email per configured window; this is what tells the admin which
   *  window they're looking at. */
  windowLabel: string
}

export function RenewalReminderEmail({
  brandName,
  supportEmail,
  legalEntity,
  businesses,
  adminUrl,
  windowLabel,
}: RenewalReminderEmailProps) {
  const count = businesses.length
  return (
    <Layout
      brandName={brandName}
      supportEmail={supportEmail}
      legalEntity={legalEntity}
      preview={`${count} business${count === 1 ? "" : "es"} ${windowLabel.toLowerCase()}`}
    >
      <Heading
        as="h1"
        style={{
          fontSize: "20px",
          fontWeight: 700,
          letterSpacing: "-0.01em",
          margin: "0 0 8px 0",
        }}
      >
        {windowLabel}
      </Heading>

      <Text style={{ margin: "0 0 20px 0", color: theme.colors.mutedForeground }}>
        {count} business{count === 1 ? "" : "es"} in this window.
      </Text>

      <Hr style={{ borderColor: theme.colors.border, margin: "0 0 16px 0" }} />

      {businesses.map((b, i) => (
        <Section key={i} style={{ margin: "0 0 12px 0" }}>
          <Text style={{ margin: "0 0 2px 0", fontWeight: 600 }}>
            {b.businessName}
          </Text>
          <Text style={{ margin: 0, color: theme.colors.mutedForeground, fontSize: "13px" }}>
            {b.planName ? `${b.planName} · ` : ""}
            Expires {new Date(b.endDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {b.daysRemaining === 0
              ? " (today)"
              : b.daysRemaining === 1
                ? " (tomorrow)"
                : ` (${b.daysRemaining} days)`}
          </Text>
        </Section>
      ))}

      <Hr style={{ borderColor: theme.colors.border, margin: "16px 0" }} />

      <Section style={{ padding: "4px 0 0 0" }}>
        <Button href={adminUrl}>View renewing businesses</Button>
      </Section>
    </Layout>
  )
}
