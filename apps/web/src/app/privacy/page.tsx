import { brand } from "@mlabs/config"
import { LegalPage, LegalSection } from "@/components/legal/legal-page"

export const metadata = {
  title: "Privacy policy",
  description: "How we collect, use, and protect your data.",
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" lastUpdated="—">
      <p>
        {/* TODO: client legal review — intro paragraph */}
        This Privacy policy describes how {brand.legalEntity} (&quot;
        {brand.name}&quot;, &quot;we&quot;, &quot;us&quot;) collects,
        uses, and protects information when you use our services.
      </p>

      <LegalSection title="1. Information we collect">
        <p>
          {/* TODO: enumerate the specific categories of data this product
              actually collects — account info, usage telemetry, content
              uploaded, billing details, etc. The categories below are a
              starter; remove what doesn't apply and add what does. */}
          We collect information you provide directly (account details,
          content you upload, support requests), information collected
          automatically when you use the service (log data, device
          information, approximate location from IP), and information from
          third parties you authorise (OAuth providers, integrated tools).
        </p>
      </LegalSection>

      <LegalSection title="2. How we use information">
        <p>
          {/* TODO: list specific uses tied to lawful bases (GDPR Article
              6). Map each use to whether it's necessary for the contract,
              consent-based, or based on legitimate interest. */}
          We use the information to provide and improve the service,
          authenticate users, communicate about the service, prevent
          abuse, and comply with legal obligations.
        </p>
      </LegalSection>

      <LegalSection title="3. Sharing">
        <p>
          {/* TODO: list every subprocessor by name (auth provider, hosting,
              email provider, analytics if any). GDPR requires this to be
              kept current. */}
          We do not sell personal information. We share information with
          service providers we rely on to operate the service, and when
          required by law.
        </p>
      </LegalSection>

      <LegalSection title="4. Data retention">
        <p>
          {/* TODO: state actual retention windows per category. "As long as
              we need it" is not GDPR-compliant. */}
          We retain information for as long as needed to provide the
          service, comply with legal obligations, and resolve disputes.
        </p>
      </LegalSection>

      <LegalSection title="5. Your rights">
        <p>
          {/* TODO: list the rights applicable in the jurisdictions you
              serve (GDPR, CCPA, etc.) and the contact for exercising
              them. */}
          You can access, correct, delete, and export your data. Contact{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="text-primary hover:underline"
          >
            {brand.supportEmail}
          </a>{" "}
          to make a request.
        </p>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p>
          {/* TODO: provide the legal entity address and DPO/privacy contact
              if applicable. */}
          Questions about this policy?{" "}
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
