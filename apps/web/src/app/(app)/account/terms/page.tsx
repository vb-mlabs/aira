// /account/terms — Terms of Service + Privacy Policy in one route. Static
// SSR; copy is generic MVP placeholder pending legal review. Brand
// references flow through @aira/config so the no-brand-string-literal
// ESLint rule passes without an allowlist entry for this path.

import type { Metadata } from "next"
import { brand } from "@aira/config"
import { SectionCard } from "@/features/profile/components/section-card"
import { AccountBackLink } from "../_components/back-link"

export const metadata: Metadata = {
  title: "Terms & privacy",
}

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <AccountBackLink />
      <header>
        <h1 className="font-display text-2xl text-foreground">
          Terms & privacy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The rules of the road for using {brand.name}. These are pre-launch
          drafts pending final legal review — questions go to{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="text-primary underline-offset-2 hover:underline"
          >
            {brand.supportEmail}
          </a>
          .
        </p>
      </header>

      <SectionCard title="Terms of service">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Use of service.</strong>{" "}
            {brand.name} is provided by {brand.legalEntity}. By using the
            service you agree to act in good faith — no impersonation, no
            harassment, no scraping content for resale.
          </p>
          <p>
            <strong className="text-foreground">User content.</strong> You own
            what you post. By posting you grant {brand.legalEntity} a
            non-exclusive licence to display your content within the {brand.name}{" "}
            app and emails sent on your behalf.
          </p>
          <p>
            <strong className="text-foreground">Account termination.</strong>{" "}
            We may suspend or terminate accounts that violate these terms. You
            may delete your own account at any time from Privacy & security.
          </p>
          <p>
            <strong className="text-foreground">Limitation of liability.</strong>{" "}
            The service is provided as-is during MVP. {brand.legalEntity} is
            not liable for any losses arising from outages, content from other
            users, or third-party services linked from the app.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Privacy policy">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">What we collect.</strong> Email
            address, display name, an optional profile photo, the content you
            post, and basic device/browser metadata for security and
            anti-abuse.
          </p>
          <p>
            <strong className="text-foreground">How we use it.</strong> To run
            the service, send transactional emails (verification, password
            reset, notifications you opted into), and surface community
            content to other signed-in users.
          </p>
          <p>
            <strong className="text-foreground">Cookies & tracking.</strong>{" "}
            We use cookies for authentication and session management only. No
            third-party analytics or advertising trackers during MVP.
          </p>
          <p>
            <strong className="text-foreground">Your rights.</strong> You may
            access, correct, or delete your data at any time. Deleting your
            account anonymises personal fields and signs you out everywhere.
            Audit log entries are preserved without your personal details.
          </p>
          <p>
            <strong className="text-foreground">Contact.</strong> Privacy
            questions go to{" "}
            <a
              href={`mailto:${brand.supportEmail}`}
              className="text-primary underline-offset-2 hover:underline"
            >
              {brand.supportEmail}
            </a>
            .
          </p>
        </div>
      </SectionCard>

      <p className="text-center text-[0.65rem] tracking-wide text-muted-foreground">
        Operated by {brand.legalEntity}
      </p>
    </div>
  )
}
