import { brand } from "@mlabs/config"
import { LegalPage, LegalSection } from "@/components/legal/legal-page"

export const metadata = {
  title: "Terms of service",
  description: "The terms that govern use of the service.",
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" lastUpdated="—">
      <p>
        {/* TODO: client legal review — intro paragraph */}
        These terms govern your use of the service operated by{" "}
        {brand.legalEntity} (&quot;{brand.name}&quot;, &quot;we&quot;,
        &quot;us&quot;). By creating an account or using the service,
        you agree to these terms.
      </p>

      <LegalSection title="1. Your account">
        <p>
          {/* TODO: state account-creation requirements specific to this
              service — age minimum, accuracy of info, single-user vs team
              accounts, prohibitions on sharing credentials. */}
          You&apos;re responsible for the activity on your account and
          for keeping your credentials secure. You must provide accurate
          information when creating an account.
        </p>
      </LegalSection>

      <LegalSection title="2. Acceptable use">
        <p>
          {/* TODO: enumerate prohibited uses specific to the product
              category. AI products typically prohibit: misuse to harm
              others, illegal content, attempts to extract training data,
              circumventing rate limits. */}
          You agree not to use the service for unlawful purposes,
          interfere with the service&apos;s operation, or attempt to
          access another user&apos;s account or data.
        </p>
      </LegalSection>

      <LegalSection title="3. Your content">
        <p>
          {/* TODO: clarify ownership (user keeps their content) vs license
              granted to the service (necessary to operate). Mention
              training data if relevant. */}
          You retain ownership of content you upload. You grant us the
          rights necessary to operate the service — to store, display,
          and process your content on your behalf.
        </p>
      </LegalSection>

      <LegalSection title="4. Service availability">
        <p>
          {/* TODO: set realistic expectations. "Best effort" is fine for an
              MVP; if you offer an SLA, link to it. */}
          We provide the service on a reasonable-effort basis. Planned
          maintenance and unplanned outages will happen; we&apos;ll
          communicate significant ones via the support email below.
        </p>
      </LegalSection>

      <LegalSection title="5. Payments">
        <p>
          {/* TODO: replace once you've enabled billing. Include refund
              policy, trial behaviour, dunning. */}
          Paid plans are billed in advance on a recurring basis. Cancel
          any time; cancellation takes effect at the end of the current
          billing period.
        </p>
      </LegalSection>

      <LegalSection title="6. Termination">
        <p>
          {/* TODO: state grounds for termination (breach, non-payment,
              extended inactivity) and data-export window post-termination. */}
          We may suspend or terminate accounts that violate these terms.
          You can close your account at any time from the profile
          settings.
        </p>
      </LegalSection>

      <LegalSection title="7. Disclaimers and liability">
        <p>
          {/* TODO: have counsel review the cap on liability and disclaimer
              language for your jurisdiction. */}
          The service is provided &quot;as is&quot;. To the maximum
          extent permitted by law, our liability is limited as described
          in the full terms.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>
          Questions about these terms?{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="text-primary hover:underline"
          >
            {brand.supportEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}
