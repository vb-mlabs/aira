// Shared shell for every transactional email. Renders a centered 600px
// container with brand-name header bar, body slot, and footer (legal entity,
// support email, "you're receiving this" line).
//
// IMPORTANT: this file MUST NOT import "server-only". @react-email/render runs
// in node but does not need the server-only barrier — components themselves
// stay environment-agnostic so they can also render in dev preview pages.

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import type { ReactNode } from "react"
import { theme } from "./theme"

export interface LayoutProps {
  /** Brand display name (header + footer + recipient context). */
  brandName: string
  /** Support inbox shown in the footer. */
  supportEmail: string
  /** Legal entity shown in the footer (copyright line). */
  legalEntity: string
  /**
   * Inbox preview line (the gray text shown next to the subject in Gmail,
   * Apple Mail, etc.). Keep under ~90 chars.
   */
  preview: string
  children: ReactNode
}

export function Layout({
  brandName,
  supportEmail,
  legalEntity,
  preview,
  children,
}: LayoutProps) {
  const year = new Date().getFullYear()
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: theme.colors.muted,
          fontFamily: theme.font.sans,
          margin: 0,
          padding: `${theme.size.padding}px 0`,
        }}
      >
        <Container
          style={{
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: `${theme.size.radius}px`,
            margin: "0 auto",
            maxWidth: `${theme.size.container}px`,
            padding: `${theme.size.padding}px`,
          }}
        >
          <Section style={{ paddingBottom: `${theme.size.paddingTight}px` }}>
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.textSize.heading,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              {brandName}
            </Text>
          </Section>

          <Hr
            style={{
              borderColor: theme.colors.border,
              margin: `0 0 ${theme.size.padding}px 0`,
            }}
          />

          <Section
            style={{
              color: theme.colors.foreground,
              fontSize: theme.textSize.body,
              lineHeight: 1.5,
            }}
          >
            {children}
          </Section>

          <Hr
            style={{
              borderColor: theme.colors.border,
              margin: `${theme.size.padding}px 0 ${theme.size.paddingTight}px 0`,
            }}
          />

          <Section>
            <Text
              style={{
                color: theme.colors.mutedForeground,
                fontSize: theme.textSize.footer,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              You're receiving this email from {brandName}. Questions? Reply
              to this email or write to{" "}
              <Link
                href={`mailto:${supportEmail}`}
                style={{ color: theme.colors.primary }}
              >
                {supportEmail}
              </Link>
              .
            </Text>
            <Text
              style={{
                color: theme.colors.mutedForeground,
                fontSize: theme.textSize.footer,
                margin: `${theme.size.paddingTight}px 0 0 0`,
              }}
            >
              &copy; {year} {legalEntity}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
