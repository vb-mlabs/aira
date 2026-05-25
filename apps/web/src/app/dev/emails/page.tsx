// Dev preview for @mlabs/email templates. Renders each React Email component
// in an isolated iframe (srcDoc) so the email styles don't leak into the
// page chrome. Returns 404 in production so the dev affordance never ships.
//
// Delete src/app/dev/ before v1 ship.

import { notFound } from "next/navigation"
import { brand } from "@mlabs/config"
import { NotificationEmail } from "@mlabs/email/templates/notification"
import { PasswordResetEmail } from "@mlabs/email/templates/password-reset"
import { VerifyEmail } from "@mlabs/email/templates/verify-email"
import { render } from "@react-email/render"
import { env } from "@/config/env"

export const metadata = { title: "Dev — email templates" }
export const dynamic = "force-dynamic"

const layoutChrome = {
  brandName: brand.name,
  supportEmail: brand.supportEmail,
  legalEntity: brand.legalEntity,
}

export default async function DevEmailsPage() {
  if (env.NODE_ENV === "production") notFound()

  const samples = [
    {
      slug: "verify-email",
      subject: `Verify your ${brand.name} email`,
      html: await render(
        <VerifyEmail
          {...layoutChrome}
          name="Alice"
          verifyUrl="https://app.example.com/verify-email?token=demo-token"
        />,
      ),
    },
    {
      slug: "password-reset",
      subject: `Reset your ${brand.name} password`,
      html: await render(
        <PasswordResetEmail
          {...layoutChrome}
          name="Bob"
          resetUrl="https://app.example.com/reset?token=demo-token"
          expiresInMinutes={60}
        />,
      ),
    },
    {
      slug: "notification",
      subject: "You have a new signal",
      html: await render(
        <NotificationEmail
          {...layoutChrome}
          title="You have a new signal"
          body={
            "A signal you've been watching just changed.\n\nTap below to review it before it expires."
          }
          ctaLabel="View signal"
          ctaUrl="https://app.example.com/signals/42"
        />,
      ),
    },
  ]

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-xl font-semibold">@mlabs/email templates</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live previews of every React Email template, branded from{" "}
          <code>@mlabs/config</code>. Edit{" "}
          <code>packages/email/src/templates/*.tsx</code> and refresh.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This route is dev-only — it returns 404 in production.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {samples.map((sample) => (
          <section key={sample.slug}>
            <h2 className="mb-1 text-sm font-semibold">{sample.slug}</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Subject: <code>{sample.subject}</code>
            </p>
            <iframe
              title={`Preview of ${sample.slug}`}
              srcDoc={sample.html}
              className="h-[720px] w-full rounded-md border border-border bg-white"
            />
          </section>
        ))}
      </div>
    </main>
  )
}
