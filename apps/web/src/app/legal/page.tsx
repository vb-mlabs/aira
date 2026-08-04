// /legal — the single source of truth for AIRA's user-facing policies.
//
// One page, ten anchored sections. Mobile deep-links (`/legal#privacy`,
// `/legal#deletion`, etc.) target the section ids declared below; keep
// this list in sync with:
//   - apps/mobile/app/(app)/account/privacy-security.tsx
//   - apps/mobile/app/(app)/account/terms.tsx
//   - apps/mobile/app/(app)/account/about.tsx
//   - apps/mobile/app/(app)/account/index.tsx (delete-account dialog link)
//   - apps/web/src/components/marketing/marketing-footer.tsx
//
// Anchors:
//   #terms, #privacy, #privacy-choices, #listing-disclaimer, #sponsored,
//   #verification, #aira-review, #community, #refunds, #deletion, #contact
//
// The `legal/` folder is in the no-brand-string-literal allowlist
// (tooling/eslint-config/src/rules/no-brand-string-literal.mjs — `/legal/`
// path segment), so the copy may spell out "AIRA" and "Nisarga Group LLC"
// verbatim to keep it readable and legally precise. Where a rebrand-safe
// interpolation reads naturally we still use brand.*.

import Link from "next/link"
import { brand } from "@aira/config"
import { LegalPage, LegalSection } from "@/components/legal/legal-page"

export const metadata = {
  title: `${brand.name} Legal & Policies`,
  description:
    "Terms of use, privacy policy, business listing disclaimer, sponsored placement, verification, review policy, community guidelines, refunds, and account deletion.",
}

// Working defaults for effective / last-updated. Bump these when the
// copy changes materially — the LegalPage chrome renders the last
// updated string in the page header. The placeholder markers in the
// source brief ([EFFECTIVE DATE], [LAST UPDATED DATE]) are captured
// here in one place so a legal reviewer can adjust both without
// hunting through the body.
const EFFECTIVE_DATE = "2026-08-04"
const LAST_UPDATED = "2026-08-04"

// Contact addresses. The source brief uses three distinct placeholders
// ([SUPPORT EMAIL], [BILLING EMAIL], [PAYMENT SUPPORT EMAIL]); until
// dedicated inboxes exist the general support address covers all three.
// Change these to dedicated addresses without touching the copy.
const SUPPORT_EMAIL = brand.supportEmail
const BILLING_EMAIL = brand.supportEmail
const PAYMENT_SUPPORT_EMAIL = brand.supportEmail

/** Table-of-contents entry — anchor id + human label. Renders once as
 *  jump links at the top of the page. */
const TOC: Array<{ id: string; label: string }> = [
  { id: "terms", label: "1. Terms of Use" },
  { id: "privacy", label: "2. Privacy Policy" },
  { id: "listing-disclaimer", label: "3. Business Listing Disclaimer" },
  { id: "sponsored", label: "4. Sponsored Placement Policy" },
  { id: "verification", label: `5. How ${brand.name} Verification Works` },
  { id: "aira-review", label: `6. ${brand.name} Stars & ${brand.name} Review Policy` },
  { id: "community", label: "7. Community Guidelines" },
  { id: "refunds", label: "8. Refund & Cancellation Policy" },
  { id: "deletion", label: "9. Account & Data Deletion" },
  { id: "contact", label: "10. Contact Information" },
]

/** Small styled sub-heading used inside a LegalSection to break long
 *  sections (Terms of Use, Refund policy) into scannable chunks. h3 so
 *  document outline stays sensible for screen readers. */
function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-base font-semibold tracking-tight text-foreground">
      {children}
    </h3>
  )
}

function Mail({ address }: { address: string }) {
  return (
    <a
      href={`mailto:${address}`}
      className="font-medium text-primary hover:underline"
    >
      {address}
    </a>
  )
}

export default function LegalPageRoute() {
  return (
    <LegalPage
      title={`${brand.name} Legal & Policies`}
      lastUpdated={LAST_UPDATED}
    >
      {/* Preamble — operator identity, effective date, contact.
          Effective date is separate from the header's Last Updated
          because the two often differ post-launch. */}
      <div>
        <p>
          <strong>Effective Date:</strong> {EFFECTIVE_DATE}
          <br />
          <strong>Last Updated:</strong> {LAST_UPDATED}
        </p>
        <p className="mt-4">
          {brand.name} by {brand.parentName} is operated by {brand.legalEntity}{" "}
          (&ldquo;{brand.name},&rdquo; &ldquo;{brand.parentName} Group,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). These
          policies apply to the {brand.name} mobile application, website,
          business listings, community features, and related services.
        </p>
        <p className="mt-4">
          <strong>Website:</strong>{" "}
          <a
            href={brand.url}
            className="font-medium text-primary hover:underline"
          >
            {brand.url.replace(/^https?:\/\//, "")}
          </a>
          <br />
          <strong>Contact:</strong> <Mail address={SUPPORT_EMAIL} />
        </p>
      </div>

      {/* Table of contents. Native anchor links; the marketing nav is
          sticky-ish so LegalSection uses scroll-mt-24 to compensate. */}
      <section
        aria-labelledby="toc-heading"
        className="rounded-2xl border border-border bg-muted/40 p-6"
      >
        <h2
          id="toc-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        >
          Contents
        </h2>
        <ol className="grid grid-cols-1 gap-x-6 gap-y-1 text-[15px] sm:grid-cols-2">
          {TOC.map((item) => (
            <li key={item.id}>
              <Link
                href={`#${item.id}`}
                className="text-foreground hover:text-primary hover:underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* 1. Terms of Use */}
      <LegalSection id="terms" title="1. Terms of Use">
        <p>
          By creating an account, submitting or managing a business listing,
          purchasing a service, posting content, or otherwise using {brand.name},
          you agree to these Terms of Use and acknowledge the Privacy Policy.
          If you do not agree, do not use {brand.name}.
        </p>

        <SubHeading>Eligibility</SubHeading>
        <p>
          General discovery features are intended for users age 13 or older. A
          person must be at least 18 years old and legally able to enter a
          contract to purchase business services, accept payment obligations, or
          submit a listing as a business owner or authorized representative.
        </p>

        <SubHeading>Accounts</SubHeading>
        <p>
          You are responsible for providing accurate information, protecting
          your login credentials, keeping your contact details current, and
          notifying {brand.name} of suspected unauthorized access. You may not
          impersonate another person or create an account for an unlawful or
          misleading purpose.
        </p>

        <SubHeading>Business Listings</SubHeading>
        <p>
          A person submitting or managing a listing represents that they are
          the business owner or are authorized to act for the business. Listing
          information must be accurate, lawful, current, and not misleading.{" "}
          {brand.name} may request supporting information and may edit
          formatting, decline, suspend, correct, or remove a listing to protect
          users or the integrity of the platform.
        </p>

        <SubHeading>Discovery Platform</SubHeading>
        <p>
          {brand.name} provides business discovery, information, communication
          links, and community features. Unless a separate written agreement
          says otherwise, {brand.name} is not the seller or provider of the
          products or services offered by listed businesses and is not a party
          to transactions between users and businesses.
        </p>

        <SubHeading>User Content</SubHeading>
        <p>
          You retain ownership of content you submit. You grant{" "}
          {brand.legalEntity} a non-exclusive, worldwide, royalty-free license
          to host, store, reproduce, format, display, distribute, moderate, and
          use that content as reasonably necessary to operate, improve, and
          promote {brand.name}. You confirm that you have the rights and
          permissions required to submit the content.
        </p>

        <SubHeading>Prohibited Conduct</SubHeading>
        <p>
          You may not use {brand.name} for illegal activity, fraud,
          impersonation, false or misleading claims, harassment, threats, hate
          speech, obscene content, spam, malware, infringement, disclosure of
          private information, fake reviews, rating manipulation, undisclosed
          paid promotion, scraping, unauthorized access, or interference with
          the platform.
        </p>

        <SubHeading>Moderation and Enforcement</SubHeading>
        <p>
          {brand.name} may review, restrict, remove, preserve, or disclose
          content and may warn, suspend, or terminate accounts when reasonably
          necessary to enforce policies, investigate fraud or safety concerns,
          protect users, comply with law, or maintain platform integrity.
        </p>

        <SubHeading>Paid Business Services</SubHeading>
        <p>
          Memberships, sponsorships, verification, reviews, and other paid
          services are governed by the applicable purchase description, order
          form, and Refund &amp; Cancellation Policy. Payment does not guarantee
          leads, customers, sales, rankings, positive reviews, verification
          approval, or any particular result.
        </p>

        <SubHeading>Third-Party Services</SubHeading>
        <p>
          {brand.name} may provide links to telephone, websites, maps, messaging
          services, payment services, and social-media platforms. Those services
          are operated by third parties and are governed by their own terms and
          privacy practices.
        </p>

        <SubHeading>Intellectual Property</SubHeading>
        <p>
          The {brand.name} name, logos, software, design, text, graphics,
          databases, and other platform materials are owned by or licensed to{" "}
          {brand.legalEntity} and may not be copied, modified, or used without
          permission except as allowed by law.
        </p>

        <SubHeading>Disclaimer of Warranties</SubHeading>
        <p>
          To the fullest extent permitted by law, {brand.name} is provided
          &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We do not
          guarantee uninterrupted access, error-free operation, or that every
          listing, review, credential, price, service, or other item of
          information is complete, current, accurate, or suitable for a
          particular purpose.
        </p>

        <SubHeading>Limitation of Liability</SubHeading>
        <p>
          To the fullest extent permitted by law, {brand.legalEntity} will not
          be liable for indirect, incidental, special, consequential, exemplary,
          or punitive damages, or for losses arising from a user&rsquo;s
          dealings with a listed business. Final liability wording should be
          reviewed by legal counsel.
        </p>

        <SubHeading>Termination</SubHeading>
        <p>
          You may stop using {brand.name} and request account deletion.{" "}
          {brand.name} may restrict or terminate access for policy violations,
          fraud, safety concerns, nonpayment, legal requirements, or material
          platform risk.
        </p>

        <SubHeading>Governing Law</SubHeading>
        <p>
          These Terms are governed by the laws of the State of Georgia, without
          regard to conflict-of-law rules. Final dispute-resolution, venue,
          arbitration, or class-action language should be reviewed by legal
          counsel.
        </p>

        <SubHeading>Changes</SubHeading>
        <p>
          We may update these Terms. The Last Updated date will identify the
          latest version. Additional notice will be provided when required by
          law.
        </p>
      </LegalSection>

      {/* 2. Privacy Policy — sub-anchor #privacy-choices lives here */}
      <LegalSection id="privacy" title="2. Privacy Policy">
        <p>
          This Privacy Policy explains how {brand.name} collects, uses, shares,
          retains, and protects information. The final policy must match the
          data and software tools actually used by {brand.name}.
        </p>

        <SubHeading>Information You Provide</SubHeading>
        <p>
          Depending on how you use {brand.name}, we may collect your name, email
          address, phone number, account credentials or authentication
          identifiers, profile information, favorites, notification choices,
          posts, comments, uploaded images, reports, support messages, business
          listing information, owner or representative information, verification
          materials, review materials, and transaction information.
        </p>

        <SubHeading>Information Collected Automatically</SubHeading>
        <p>
          We may collect device type, operating system, app version, IP address,
          usage events, search and listing activity, diagnostics, crash
          information, security events, and permitted identifiers. We collect
          precise or approximate location only when the app uses that feature
          and the user permits it.
        </p>

        <SubHeading>How We Use Information</SubHeading>
        <p>
          We may use information to create and operate accounts; provide
          search, listings, favorites, posts, comments, notifications, and
          support; onboard and communicate with businesses; process paid
          services; verify information; conduct reviews; moderate content;
          prevent fraud and abuse; secure and troubleshoot {brand.name}; analyze
          and improve performance; communicate service updates; comply with
          law; and enforce agreements.
        </p>

        <SubHeading>Service Providers and Sharing</SubHeading>
        <p>
          We may use third-party providers for hosting, databases,
          authentication, analytics, crash reporting, notifications, email,
          customer support, security, payments, and professional advice. We may
          also share information when a user intentionally contacts a business,
          when required to comply with law or protect safety and rights, or in
          connection with a corporate transaction.
        </p>

        <SubHeading>Sale or Advertising Statement</SubHeading>
        <p>
          Before publishing a statement about whether {brand.name} sells or
          shares personal information for targeted advertising, the developer
          and legal reviewer must confirm the practices of every analytics,
          advertising, and software provider used by {brand.name}.
        </p>

        <SubHeading>Retention</SubHeading>
        <p>
          We retain information only for as long as reasonably needed for the
          purposes described in this policy, including service delivery,
          security, fraud prevention, contractual records, dispute resolution,
          legal compliance, and legitimate business operations.
        </p>

        <SubHeading>Security</SubHeading>
        <p>
          We use reasonable administrative, technical, and organizational
          measures intended to protect information. No system is completely
          secure, and we cannot guarantee absolute security.
        </p>

        {/* The mobile Privacy screen links directly to this sub-anchor
            (/legal#privacy-choices). scroll-mt-24 handled inline on the
            h3 so the section anchor still works for the parent. */}
        <h3
          id="privacy-choices"
          className="mt-6 mb-2 scroll-mt-24 text-base font-semibold tracking-tight text-foreground"
        >
          Your Choices
        </h3>
        <p>
          You may update certain account information, manage notifications and
          device permissions, edit or delete your own posts where supported,
          opt out of optional marketing communications, and request access,
          correction, or deletion of personal information by using the in-app
          controls or contacting <Mail address={SUPPORT_EMAIL} />.
        </p>

        <SubHeading>Account Deletion</SubHeading>
        <p>
          Users may initiate deletion of their {brand.name} user account
          through the Account section of the app and through{" "}
          <a
            href={`${brand.url}/delete-account`}
            className="font-medium text-primary hover:underline"
          >
            {brand.url.replace(/^https?:\/\//, "")}/delete-account
          </a>
          . A user-account deletion request applies to the login account and
          personal data associated with that account. It does not automatically
          cancel a separate business membership or remove an active business
          listing. {brand.name} may retain limited business, membership,
          transaction, security, fraud-prevention, contractual,
          dispute-resolution, or legally required records as described in this
          Privacy Policy.
        </p>

        <SubHeading>Children</SubHeading>
        <p>
          {brand.name} is not directed to children under 13, and we do not
          knowingly collect personal information from children under 13. Paid
          business services and legally binding business submissions are
          limited to adults.
        </p>

        <SubHeading>Changes and Contact</SubHeading>
        <p>
          We may update this policy and will change the Last Updated date.
          Privacy questions and requests may be sent to{" "}
          <Mail address={SUPPORT_EMAIL} />.
        </p>
      </LegalSection>

      {/* 3. Business Listing Disclaimer */}
      <LegalSection
        id="listing-disclaimer"
        title="3. Business Listing Disclaimer"
      >
        <p>
          {brand.name} is a business discovery and information platform.
          Business names, descriptions, contact details, hours, services,
          prices, availability, photographs, credentials, licenses, insurance
          information, and other details may be provided by businesses,
          authorized representatives, users, public sources, or service
          providers.
        </p>
        <p>
          {brand.name} makes reasonable efforts to present useful information
          but does not guarantee that every listing is complete, current,
          accurate, lawful, licensed, insured, safe, or suitable for a
          particular purpose.
        </p>
        <p>
          Users should independently confirm important information directly
          with the business before visiting, booking, purchasing, paying,
          signing a contract, or relying on professional advice.
        </p>
        <p>
          Inclusion in {brand.name} does not by itself mean that{" "}
          {brand.legalEntity} recommends, certifies, endorses, licenses,
          guarantees, or assumes responsibility for a business, its owners,
          employees, products, services, statements, or conduct.
        </p>
        <p>
          Any agreement, purchase, booking, payment, service, dispute, loss,
          injury, cancellation, or claim is between the user and the business
          unless a separate written agreement expressly states otherwise.
        </p>
        <p>
          Report inaccurate or outdated information to{" "}
          <Mail address={SUPPORT_EMAIL} />.
        </p>
      </LegalSection>

      {/* 4. Sponsored Placement Policy */}
      <LegalSection id="sponsored" title="4. Sponsored Placement Policy">
        <p>
          Businesses may pay {brand.name} for increased visibility, featured
          placement, category placement, or other promotional exposure.
        </p>
        <p>
          {brand.name} identifies paid placement with a clear
          &ldquo;Sponsored&rdquo; or &ldquo;Advertisement&rdquo; label near the
          listing or content. Sponsored placement affects visibility or
          presentation only. It does not mean that the business has received a
          higher quality rating, is endorsed by {brand.name}, is licensed or
          insured, or is guaranteed to provide satisfactory products or
          services.
        </p>
        <p>
          Different sponsorship levels may provide different visibility or
          promotional features. {brand.name} may reject, suspend, or remove
          sponsored content that is misleading, unlawful, unsafe, inconsistent
          with {brand.name} policies, or likely to harm users or platform
          integrity.
        </p>
        <p>
          Purchase of sponsorship does not guarantee impressions, clicks,
          inquiries, customers, sales, revenue, or business results.
        </p>
      </LegalSection>

      {/* 5. How AIRA Verification Works */}
      <LegalSection
        id="verification"
        title={`5. How ${brand.name} Verification Works`}
      >
        <p>
          An {brand.name} Verified badge means only that {brand.name} reviewed
          the specific identity or listing information described in the current
          verification process at the time of review.
        </p>
        <p>
          The badge does not guarantee service quality, safety, customer
          satisfaction, financial condition, insurance, legal compliance,
          licensing, or future conduct unless a particular item is expressly
          identified as verified.
        </p>
        <p>
          {brand.name} may review items such as the identity of the owner or
          authorized representative, business contact information, address or
          service area, business registration, and a professional license when
          the verification service expressly includes that check. Verification
          requirements are shared with the business before purchase. Visit our
          website to learn what {brand.name} reviews for the Verified Badge.
        </p>
        <p>
          Payment does not guarantee approval. {brand.name} may decline,
          suspend, expire, or remove a badge when information is incomplete,
          changes, expires, cannot be confirmed, or a credible complaint creates
          a material concern.
        </p>
        <p>
          Users should independently verify any credential important to their
          decision.
        </p>
      </LegalSection>

      {/* 6. AIRA Stars & AIRA Review Policy */}
      <LegalSection
        id="aira-review"
        title={`6. ${brand.name} Stars & ${brand.name} Review Policy`}
      >
        <p>
          {brand.name} Reviews and {brand.name} Stars are paid evaluation
          services available only to business categories that {brand.name} is
          currently qualified and equipped to evaluate. {brand.name} may
          decline to offer the service to certain businesses or categories.
        </p>
        <p>
          Before purchasing the service, the business will be informed about
          the evaluation process, applicable criteria, required information,
          fee, and publication terms. By purchasing the service, the business
          agrees that {brand.name} may publish the completed review and{" "}
          {brand.name} Stars whether the result is positive, neutral, or
          unfavorable.
        </p>
        <p>
          Before publication, {brand.name} will provide the business with a
          copy of the review to identify factual errors. The business may
          submit supporting information to request correction of factual
          inaccuracies but may not edit, negotiate, purchase, or influence{" "}
          {brand.name}&rsquo;s opinions, conclusions, or {brand.name} Stars.
        </p>
        <p>
          The review fee covers {brand.name}&rsquo;s time and evaluation work.
          The fee is non-refundable once {brand.name} begins the evaluation,
          including when the business disagrees with the review or rating. If{" "}
          {brand.name} determines before beginning the evaluation that the
          business is not eligible, {brand.name} will not charge the fee or
          will refund any amount already collected.
        </p>
        <p>
          Membership, sponsorship, advertising, or other payments do not
          improve or influence an {brand.name} Review or {brand.name} Stars.
        </p>
        <p>
          {brand.name} may delay or decline publication when required
          information is incomplete, the evaluation cannot be completed,
          publication may violate law, or significant safety, accuracy,
          conflict-of-interest, or integrity concerns exist. {brand.name} will
          not withhold a completed review merely because the result is
          unfavorable.
        </p>
        <p>
          Reviews reflect {brand.name}&rsquo;s observations and information
          available on the evaluation date. {brand.name} may update, expire,
          suspend, or remove a review when it becomes outdated, business
          conditions materially change, or credible new information affects its
          accuracy or reliability.
        </p>
        <p>
          {brand.name} Reviews are paid evaluation services. The business pays{" "}
          {brand.name} for the evaluation process. Payment does not guarantee a
          positive review or a specific number of {brand.name} Stars.
        </p>
      </LegalSection>

      {/* 7. Community Guidelines */}
      <LegalSection id="community" title="7. Community Guidelines">
        <p>
          {brand.name} is intended to be a respectful, useful, and trustworthy
          community. Users are responsible for the content they post.
        </p>
        <p>
          Do not post or engage in false or misleading information, harassment,
          threats, hate speech, obscene or sexually explicit content, spam,
          scams, impersonation, private personal information, copyright or
          trademark infringement, illegal offers, malware, fake reviews, rating
          manipulation, competitor attacks, or undisclosed paid promotions.
        </p>
        <p>
          Content should be relevant to the {brand.name} community and should
          not misrepresent personal experience, business ownership, employment,
          compensation, or another relationship that may affect credibility.
        </p>
        <p>
          Users may report content, comments, listings, or accounts that may
          violate these rules and may block another user where the feature is
          available.
        </p>
        <p>
          {brand.name} may review, limit, remove, preserve, or report content
          and may warn, suspend, or terminate accounts. We may retain evidence
          when reasonably needed for safety, fraud prevention, legal compliance,
          or dispute resolution.
        </p>
        <p>
          For immediate danger or emergencies, contact the appropriate
          emergency service. {brand.name} is not an emergency service.
        </p>
      </LegalSection>

      {/* 8. Refund & Cancellation Policy */}
      <LegalSection id="refunds" title="8. Refund & Cancellation Policy">
        <SubHeading>General Cancellation</SubHeading>
        <p>
          A business may cancel future renewal of a recurring service by
          following the cancellation method stated at purchase. Cancellation
          does not automatically refund amounts already charged for a service
          period that has begun, except where required by law or expressly
          stated in the purchase terms.
        </p>

        <SubHeading>Work Already Started</SubHeading>
        <p>
          Fees for verification, review, content preparation, onboarding, or
          another service may become non-refundable after {brand.name} begins
          the work, provided that this condition was clearly disclosed before
          purchase.
        </p>

        <SubHeading>No Guaranteed Result</SubHeading>
        <p>
          A refund is not available merely because a listing, sponsorship,
          verification request, or review does not generate leads, customers,
          sales, approval, or a favorable rating.
        </p>

        <SubHeading>{brand.name}-Caused Non-Delivery</SubHeading>
        <p>
          If {brand.name} cannot provide a purchased service for reasons within
          its control, {brand.name} may provide a replacement service, service
          credit, or refund as stated in the applicable order terms.
        </p>

        <SubHeading>Policy Violations</SubHeading>
        <p>
          {brand.name} may suspend or remove services for false information,
          nonpayment, unlawful content, fraud, safety concerns, or violation of{" "}
          {brand.name} policies. The applicable purchase terms should state
          whether any unused amount is refundable.
        </p>

        <SubHeading>Refund Requests</SubHeading>
        <p>
          Refund requests must be sent to <Mail address={BILLING_EMAIL} />{" "}
          within 24 hours of the charge and must include the business name,
          purchaser name, service purchased, payment date, and reason for the
          request.
        </p>
        <p>
          All fees, service details, and applicable terms will be shown or
          communicated before payment. Except where required by law, refunds
          are provided according to the rules below.
        </p>

        <SubHeading>Business Membership</SubHeading>
        <p>
          A business may request cancellation and a full refund within 24
          hours of payment before {brand.name} begins creating or activating
          the business listing.
        </p>
        <p>
          Once listing setup has started or the listing has been published, the
          membership fee is non-refundable. The listing will remain active
          until the end of the purchased membership period unless it is removed
          earlier for a policy violation or at the business&rsquo;s request.
        </p>
        <p>
          Memberships do not automatically renew unless expressly stated at the
          time of purchase. If a membership is not renewed, the listing will be
          removed after the membership expires.
        </p>

        <SubHeading>Sponsorship</SubHeading>
        <p>
          All sponsorship payments are final and non-refundable because{" "}
          {brand.name} reserves the placement and begins setup immediately
          after payment is received.
        </p>
        <p>
          If a business cancels, changes its plans, or does not provide
          required materials on time, no refund will be issued. {brand.name}{" "}
          may, at its discretion, allow the sponsorship to be rescheduled or
          transferred to another available placement.
        </p>
        <p>
          If {brand.name} is unable to provide the agreed sponsorship,{" "}
          {brand.name} may reschedule it or provide an equivalent sponsorship
          credit.
        </p>

        <SubHeading>Verified Badge</SubHeading>
        <p>
          The Verified Badge service is offered only after {brand.name}{" "}
          confirms that the business and its category are eligible.
        </p>
        <p>
          All Verified Badge payments are final and non-refundable. The fee
          covers {brand.name}&rsquo;s verification process and administrative
          work. Payment does not guarantee approval or receipt of the Verified
          Badge.
        </p>
        <p>
          No refund will be issued if the business does not qualify, does not
          provide the required information, withdraws its request, or disagrees
          with {brand.name}&rsquo;s decision.
        </p>
        <p>
          The fee covers one verification process. Re-verification, renewal, or
          future updates may require a separate non-refundable fee, which will
          be communicated before payment.
        </p>

        <SubHeading>Initial {brand.name} Review</SubHeading>
        <p>
          {brand.name} Reviews are offered only after {brand.name} confirms
          that the business and its category are eligible for evaluation.
        </p>
        <p>
          All {brand.name} Review payments are final and non-refundable. The
          fee covers {brand.name}&rsquo;s evaluation process and does not
          guarantee a positive review or a specific number of {brand.name}{" "}
          Stars.
        </p>
        <p>
          No refund will be issued if the business withdraws, fails to provide
          required information, disagrees with the review, rating, or
          publication, or receives a lower rating than expected.
        </p>
        <p>
          Before publication, the business may review the report only to
          identify factual errors. The business cannot change or influence{" "}
          {brand.name}&rsquo;s opinions, conclusions, or {brand.name} Stars.
        </p>

        <SubHeading>{brand.name} Review Renewal or Update</SubHeading>
        <p>
          An {brand.name} Review renewal or update is a separate paid service.
        </p>
        <p>
          All renewal and update payments are final and non-refundable. The fee
          covers {brand.name}&rsquo;s new evaluation of the business based on
          current information and conditions.
        </p>
        <p>
          The updated review may result in the same, higher, or lower number
          of {brand.name} Stars. Payment does not guarantee that the previous
          review or rating will remain unchanged.
        </p>
        <p>
          No refund will be issued if the business withdraws, fails to provide
          required information, or disagrees with the updated review or rating.
        </p>

        <SubHeading>Custom Services</SubHeading>
        <p>
          Refund and cancellation terms for custom services will be stated in
          the applicable proposal, invoice, or written agreement.
        </p>
        <p>
          Unless otherwise stated, a custom-service payment may be refunded
          before work begins, less any non-refundable third-party expenses
          already paid by {brand.name}. Once work begins, completed work,
          deposits, and third-party expenses are non-refundable.
        </p>

        <SubHeading>{brand.name} Cancellations and Payment Errors</SubHeading>
        <p>
          All payments are final and non-refundable, except for duplicate
          charges or confirmed payment-processing errors.
        </p>
        <p>
          If {brand.name} confirms that a business was charged more than once
          or charged an incorrect amount, {brand.name} will correct the error
          or refund only the duplicated or incorrect amount.
        </p>
        <p>
          Approved refunds will be returned to the original payment method
          whenever possible. Processing times may vary depending on the bank or
          payment provider.
        </p>
        <p>
          Payment-error requests must be submitted to{" "}
          <Mail address={PAYMENT_SUPPORT_EMAIL} /> with the business name,
          service purchased, payment date, payment receipt, and a description
          of the error.
        </p>
      </LegalSection>

      {/* 9. Account & Data Deletion */}
      <LegalSection id="deletion" title="9. Account & Data Deletion">
        <p>
          Users may request deletion of their {brand.name} user account through
          Account → Delete account in the app or through{" "}
          <a
            href={`${brand.url}/delete-account`}
            className="font-medium text-primary hover:underline"
          >
            {brand.url.replace(/^https?:\/\//, "")}/delete-account
          </a>
          .
        </p>
        <p>
          A user account is the login account used to access {brand.name}. When
          a user account is deleted, {brand.name} will delete or de-identify
          the user profile and personal data associated with that account,
          including favorites, posts, comments, and account activity, except
          information that {brand.name} reasonably needs to retain for
          security, fraud prevention, contractual records, payment records,
          legal obligations, dispute resolution, or another reason described in
          the Privacy Policy.
        </p>
        <p>
          Business memberships and business listings are administered
          separately from user login accounts. When a business purchases an{" "}
          {brand.name} membership, {brand.name} may associate an owner email
          address with the business listing. If that owner creates a user
          account, the user may view the linked business listing through the
          account.
        </p>
        <p>
          Deleting the linked user account does not cancel an active business
          membership and does not remove the business listing. The deleted
          user will lose login access to the listing, but the listing will
          continue to appear on {brand.name} until the current membership
          period ends.
        </p>
        <p>
          Before a membership expires, {brand.name} may contact the business
          owner or authorized representative regarding renewal. If the
          membership is renewed, the listing continues for the renewed period.
          If the membership is not renewed, the listing is removed after the
          membership expires according to {brand.name}&rsquo;s administrative
          process.
        </p>
        <p>
          {brand.name} may retain business-owner contact details, membership
          information, payment records, and other business records needed to
          administer the active membership, process renewal or expiration,
          maintain accurate business records, prevent fraud, resolve disputes,
          or comply with law. These records are handled separately from the
          deleted user login account.
        </p>
        <p>
          Deleting a user account does not automatically cancel a separate
          business membership, or payment obligation unless {brand.name}{" "}
          expressly confirms otherwise.
        </p>
      </LegalSection>

      {/* 10. Contact — closes the TOC's last row. Split into general,
          billing, and payment-error addresses so users know which one
          to use; they all point at the same inbox today. */}
      <LegalSection id="contact" title="10. Contact Information">
        <p>
          General questions, privacy requests, and reports of inaccurate
          information: <Mail address={SUPPORT_EMAIL} />
        </p>
        <p>
          Refund requests: <Mail address={BILLING_EMAIL} />
        </p>
        <p>
          Payment errors: <Mail address={PAYMENT_SUPPORT_EMAIL} />
        </p>
        <p>
          Operator: {brand.legalEntity}. Website:{" "}
          <a
            href={brand.url}
            className="font-medium text-primary hover:underline"
          >
            {brand.url.replace(/^https?:\/\//, "")}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}
