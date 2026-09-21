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
//   - apps/web/src/app/(app)/account/terms/page.tsx
//
// Anchors:
//   #terms, #privacy, #privacy-choices, #listing-disclaimer, #sponsored,
//   #verification, #aira-review, #community, #refunds, #deletion, #contact
//
// The `legal/` folder is in the no-brand-string-literal allowlist
// (tooling/eslint-config/src/rules/no-brand-string-literal.mjs — `/legal/`
// path segment), so the copy may spell out "AIRA" and "Nisarga Group LLC"
// verbatim. We still prefer brand.* interpolation for rebrand safety.

import Link from "next/link"
import { brand } from "@aira/config"
import { LegalPage, LegalSection } from "@/components/legal/legal-page"

export const metadata = {
  title: `${brand.name} Legal & Policies`,
  description:
    "Terms of use, privacy policy, business listing disclaimer, sponsored placement, verification, review policy, community guidelines, refunds, and account deletion.",
}

// Effective and Last Updated dates from the policy source. Bump when the
// copy changes materially — the LegalPage chrome renders the last-updated
// string in the page header.
const EFFECTIVE_DATE = "2026-08-24"
const LAST_UPDATED = "2026-09-02"

// Contact addresses. The policy uses one address for support, billing, and
// payment errors today; the three constants stay so a future split needs
// only a constant swap, not copy edits.
const SUPPORT_EMAIL = brand.supportEmail
const BILLING_EMAIL = brand.supportEmail
const PAYMENT_SUPPORT_EMAIL = brand.supportEmail

const TOC: Array<{ id: string; label: string }> = [
  { id: "terms", label: "1. Terms of Use" },
  { id: "privacy", label: "2. Privacy Policy" },
  { id: "listing-disclaimer", label: "3. Business Listing Disclaimer" },
  { id: "sponsored", label: "4. Sponsored Placement Policy" },
  { id: "verification", label: `5. ${brand.name} Verification` },
  { id: "aira-review", label: `6. ${brand.name} Stars & ${brand.name} Review Policy` },
  { id: "community", label: "7. Community Guidelines" },
  { id: "refunds", label: "8. Refund & Cancellation Policy" },
  { id: "deletion", label: "9. Account & Data Deletion" },
  { id: "contact", label: "10. Contact Information" },
]

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

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary hover:underline"
    >
      {children}
    </a>
  )
}

export default function LegalPageRoute() {
  return (
    <LegalPage
      title={`${brand.name} Terms & Conditions, Legal and Policies`}
      lastUpdated={LAST_UPDATED}
    >
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
          business listings, community features, and related services
          (&ldquo;Services&rdquo; or &ldquo;Service&rdquo;).
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
          purchasing a service, posting content, or otherwise using{" "}
          {brand.name}, you agree to these Terms of Use, agree that they are
          binding on your use of the Services, and acknowledge the Privacy
          Policy. If you do not agree to each and every term herein, do not
          use {brand.name}.
        </p>
        <p>
          We reserve the right, at our sole discretion, to change or modify
          portions of these Terms of Service at any time. If we do this, we
          will post the changes on this page and will indicate at the top of
          this page the date these terms were last revised. Any such changes
          will become effective immediately, and your continued use of the
          Service after the date any such changes become effective
          constitutes your acceptance of the new Terms of Service.
        </p>

        <SubHeading>Eligibility</SubHeading>
        <p>
          You agree that you are at least 18 years old and legally able to
          enter a contract to purchase business services, accept payment
          obligations, or submit a listing as a business owner or authorized
          representative. You agree not to use this website or application
          unless you are 18 years of age or older.
        </p>

        <SubHeading>Accounts</SubHeading>
        <p>
          You are responsible for providing accurate information, protecting
          your login credentials, keeping your contact details current, and
          notifying {brand.name} of suspected unauthorized access. You may
          not impersonate another person or create an account for an unlawful
          or misleading purpose.
        </p>

        <SubHeading>Business Listings</SubHeading>
        <p>
          A person submitting or managing a listing represents and warrants
          that they are the business owner or are authorized to act for the
          business. Listing information must be accurate, lawful, current,
          and not misleading. {brand.name} may request supporting information
          and may edit formatting, decline, suspend, correct, or remove a
          listing to protect users or the integrity of the platform.
        </p>

        <SubHeading>Discovery Platform</SubHeading>
        <p>
          {brand.name} provides business discovery, information, communication
          links, and community features. Unless a separate written agreement
          says otherwise, {brand.name} is not the seller or provider of the
          products or services offered by listed businesses and is not a
          party to transactions between users and businesses. You agree that{" "}
          {brand.name} is making no warranties of any kind, including
          warranties of fitness or merchantability, regarding any goods or
          services you find using the {brand.name} app.
        </p>

        <SubHeading>User Content</SubHeading>
        <p>
          You retain ownership of content you submit. With respect to the
          content or other materials you upload through the Service or share
          with other users or recipients (collectively, &ldquo;User
          Content&rdquo;), you represent and warrant that you own all right,
          title and interest in and to such User Content, including, without
          limitation, all copyrights and rights of publicity contained
          therein. You grant {brand.legalEntity} a non-exclusive, worldwide,
          royalty-free license to host, store, reproduce, format, display,
          distribute, moderate, and use that content as reasonably necessary
          to operate, improve, and promote {brand.name}. You confirm that you
          have the rights and permissions required to submit the content.
        </p>

        <SubHeading>Prohibited Conduct</SubHeading>
        <p>
          You may not use {brand.name} for illegal activity, fraud,
          impersonation, false or misleading claims, harassment, threats,
          hate speech, obscene content, spam, malware, infringement,
          disclosure of private information, fake reviews, rating
          manipulation, undisclosed paid promotion, scraping, unauthorized
          access, or interference with the platform.
        </p>

        <SubHeading>Moderation and Enforcement</SubHeading>
        <p>
          {brand.name} may review, restrict, remove, preserve, or disclose
          content and may warn, suspend, or terminate accounts in its sole
          and exclusive discretion for any reason, investigate fraud or
          safety concerns, protect users, comply with law, or maintain
          platform integrity.
        </p>
        <p>
          You agree to not use the Services to do any of the following, and
          you separately agree that your license to use the Services is
          conditioned upon your agreement not to:
        </p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            engage in any conversation or otherwise upload any content that
            (i) infringes any intellectual property or other proprietary
            rights of any party and/or exceed any license granted to you
            under any third-party application and/or software; (ii) you do
            not have a right to upload under any law or under contractual or
            fiduciary relationships; (iii) contains software viruses or any
            other computer code, files or programs designed to interrupt,
            destroy or limit the functionality of any computer software or
            hardware or telecommunications equipment; (iv) poses or creates a
            privacy or security risk to any person; (v) constitutes
            unsolicited or unauthorized advertising, promotional materials,
            commercial activities and/or sales, &ldquo;junk mail,&rdquo;
            &ldquo;spam,&rdquo; &ldquo;chain letters,&rdquo; &ldquo;pyramid
            schemes,&rdquo; &ldquo;contests,&rdquo; &ldquo;sweepstakes,&rdquo;
            or any other form of solicitation; (vi) is unlawful, harmful,
            threatening, abusive, harassing, tortious, excessively violent,
            defamatory, vulgar, obscene, pornographic, libelous, invasive of
            another&rsquo;s privacy, hateful racially, ethnically or otherwise
            objectionable; or (vii) in the sole judgment of{" "}
            {brand.legalEntity} is objectionable or which restricts or
            inhibits any other person from using or enjoying the Service, or
            which may expose {brand.legalEntity} or its users to any harm or
            liability of any type;
          </li>
          <li>
            record any portion of a conversation without the expressed
            consent of all of the speakers involved;
          </li>
          <li>
            share information (on {brand.name} or elsewhere) that the speaker
            explicitly stated was to be treated as &ldquo;off the
            record&rdquo;, &ldquo;confidential&rdquo;, or &ldquo;private&rdquo;;
          </li>
          <li>
            interfere with or disrupt the Service or servers or networks
            connected to the Service, or disobey any requirements,
            procedures, policies or regulations of networks connected to the
            Service;
          </li>
          <li>
            violate any applicable local, state, national or international
            law, or any regulations having the force of law;
          </li>
          <li>
            impersonate any person or entity, or falsely state or otherwise
            misrepresent your affiliation with a person or entity;
          </li>
          <li>
            solicit personal information from anyone under the age of 18 and
            without their express consent;
          </li>
          <li>
            harvest or collect email addresses or other contact information
            of other users from the Service by electronic or other means for
            the purposes of sending unsolicited emails or other unsolicited
            communications;
          </li>
          <li>
            advertise or offer to sell or buy any goods or services for any
            business purpose that is not specifically authorized;
          </li>
          <li>
            promote or aid in the building of a competitive product or
            service, copy the Service&rsquo;s features or user interface, or
            solicit users or customers from the Service;
          </li>
          <li>
            further or promote any criminal activity or enterprise or provide
            instructional information about illegal activities;
          </li>
          <li>
            obtain or attempt to access or otherwise obtain any materials or
            information through any means not intentionally made available or
            provided for through the Service; and
          </li>
          <li>
            circumvent any rights of any owner of intellectual property, and
            terms of the Privacy Policy, or any of the Terms and Conditions
            herein.
          </li>
        </ol>

        <SubHeading>Paid Business Services</SubHeading>
        <p>
          Memberships, sponsorships, verification, reviews, and other paid
          services are governed by the applicable purchase description, order
          form, and Refund &amp; Cancellation Policy. You agree that payment
          for our services does not guarantee leads, customers, sales,
          rankings, positive reviews, verification approval, or any
          particular result.
        </p>

        <SubHeading>Third-Party Services</SubHeading>
        <p>
          {brand.name} may provide links to telephone, websites, maps,
          messaging services, payment services, and social-media platforms.
          Those services are operated by third parties and are governed by
          their own terms and privacy practices. You agree to review and
          confirm your agreement with those third parties prior to using
          them.
        </p>

        <SubHeading>Intellectual Property</SubHeading>
        <p>
          The {brand.name} name, logos, software, design, text, graphics,
          databases, and other platform materials are owned by or licensed to{" "}
          {brand.legalEntity} and may not be copied, modified, or used
          without permission except as allowed by law.
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
          To the fullest extent permitted by law, {brand.legalEntity} will
          not be liable for direct, indirect, incidental, special,
          consequential, exemplary, or punitive damages, or for losses
          arising from a user&rsquo;s dealings with a listed business.
        </p>
        <p>
          You agree to release, indemnify and hold us and our affiliates and
          their officers, employees, directors, managers, representatives,
          and agents (collectively, &ldquo;Indemnitees&rdquo;) harmless from
          any and all losses, damages, expenses, including reasonable
          attorneys&rsquo; fees, rights, claims, actions of any kind and
          injury (including death) arising out of or relating to, your use
          of our services, any user content, your connection to the Service,
          your violation of these Terms of Service or your violation of any
          rights of another.
        </p>

        <SubHeading>Mobile Services</SubHeading>
        <p>
          The Service includes certain services that are available via a
          mobile device, including (i) the ability to upload content to the
          Service via a mobile device, (ii) the ability to browse the
          Service and the Site from a mobile device and (iii) the ability
          to access certain features through an application downloaded and
          installed on a mobile device (collectively, the &ldquo;Mobile
          Services&rdquo;). To the extent you access the Services through a
          mobile device, your wireless service carrier&rsquo;s standard
          charges, data rates and other fees may apply. In addition,
          downloading, installing, or using certain Mobile Services may be
          prohibited or restricted by your carrier, and not all Mobile
          Services may work with all carriers or devices. By using the
          Mobile Services, you agree that we may communicate with you
          regarding {brand.legalEntity} and other entities by SMS, MMS, text
          message or other electronic means to your mobile device and that
          certain information about your usage of the Mobile Services may
          be communicated to us. In the event you change or deactivate your
          mobile telephone number, you agree to promptly update your
          account information on the Services to ensure that your messages
          are not sent to the person that acquires your old number.
        </p>
        <p>
          You have sole and exclusive responsibility to determine what, if
          any, taxes apply to transactions or the payments you receive in
          connection with your use of the Services (&ldquo;Taxes&rdquo;).
          It is solely your responsibility to assess, collect, report, or
          remit the correct Taxes to the proper tax authority in the
          applicable jurisdiction. We are not obligated to, nor will we,
          determine whether Taxes apply, or calculate, collect, report, or
          remit any Taxes to any tax authority, arising from any User
          Transaction. {brand.legalEntity} retains the right, but not the
          obligation, at its sole discretion, to complete and file tax or
          related reports with tax authorities regarding transactions in
          those jurisdictions where {brand.legalEntity} deems such
          reporting necessary. You hereby indemnify and hold{" "}
          {brand.legalEntity} harmless from and against any and all
          liability related to Taxes and filings made by {brand.legalEntity}{" "}
          respect thereof. You agree that we may send you any tax-related
          information electronically.
        </p>

        <SubHeading>Payment Processing</SubHeading>
        <p>
          Notwithstanding any amounts owed to {brand.legalEntity} hereunder,{" "}
          <strong>
            {brand.legalEntity} DOES NOT PROCESS PAYMENT FOR ANY SERVICES.
          </strong>{" "}
          We are not a bank, payment institution, money transmitter, or
          money service business. To facilitate payment for the Service via
          bank account, credit card, or debit card, we may use a third
          party payment processor or its affiliates as necessary
          (collectively, &ldquo;Payment Processor&rdquo;). These payment
          processing services are provided by a third party Payment
          Processor and are subject to their terms and conditions and other
          policies. By agreeing to these Terms of Service, you also agree
          to be bound by the Payment Processor Agreements, as the same may
          be modified by Payment Processor from time to time. The Payment
          Processor Agreements are your agreement with Payment Processor,
          and {brand.legalEntity} is not a party to the Payment Processor
          Agreements, nor are we responsible for Payment Processor&rsquo;s
          services or any liability in respect of the Payment Processor
          Agreements. You hereby authorize Payment Processor to store and
          continue billing any Payment Instrument you provide to us or
          Payment Processor through the Services, even after such Payment
          Instrument has expired, to avoid interruptions in payment for
          your use of the Service. Please contact Payment Processor for
          more information. We reserve the right to replace Payment
          Processor with another payment processor at any time without
          notice or liability to you. If we do, you agree that the payment
          services you may access through the Service will be subject to
          the applicable terms and conditions of the successor payment
          processor, which shall be incorporated by reference herein.{" "}
          {brand.legalEntity} assumes no liability or responsibility for
          any payments you make through the Service.
        </p>

        <SubHeading>Special Notice for International Use; Export Controls</SubHeading>
        <p>
          Software (defined below) available in connection with the Service
          and the transmission of applicable data, if any, is subject to
          United States export controls. No Software may be downloaded from
          the Service or otherwise exported or re-exported in violation of
          U.S. export laws. Downloading or using the Software is at your
          sole risk. Recognizing the global nature of the Internet, you
          agree to comply with all local rules and laws regarding your use
          of the Service, including as it concerns online conduct and
          acceptable content.
        </p>

        <SubHeading>Commercial Use</SubHeading>
        <p>
          Unless otherwise expressly authorized herein or in the Service,
          you agree not to display, distribute, license, perform, publish,
          reproduce, duplicate, copy, create derivative works from, modify,
          sell, resell, exploit, transfer or upload for any commercial
          purposes, any portion of the Service, use of the Service, or
          access to the Service. The Service is for your personal use.
        </p>

        <SubHeading>Service Content, Software and Trademarks</SubHeading>
        <p>
          You acknowledge and agree that the Service may contain content or
          features (&ldquo;Service Content&rdquo;) that are protected by
          copyright, patent, trademark, trade secret or other proprietary
          rights and laws. Except as expressly authorized by{" "}
          {brand.legalEntity} you agree not to modify, copy, frame, scrape,
          rent, lease, loan, sell, distribute or create derivative works
          based on the Service or the Service Content, in whole or in part,
          except that the foregoing does not apply to your own User Content
          that you legally upload to the Service. In connection with your
          use of the Service, you will not engage in or use any data
          mining, robots, scraping or similar data gathering or extraction
          methods. If you are blocked by {brand.legalEntity} from accessing
          the Service (including by blocking your IP address), you agree
          not to implement any measures to circumvent such blocking (e.g.,
          by masking your IP address or using a proxy IP address). Any use
          of the Service or the Service Content other than as specifically
          authorized herein is strictly prohibited. The technology and
          software underlying the Service or distributed in connection
          therewith are the property of {brand.legalEntity}, our affiliates
          and our partners (the &ldquo;Software&rdquo;). You agree not to
          copy, modify, create a derivative work of, reverse engineer,
          reverse assemble or otherwise attempt to discover any source
          code, sell, assign, sublicense, or otherwise transfer any right
          in the Software. Any rights not expressly granted herein are
          reserved by {brand.legalEntity}.
        </p>
        <p>
          {brand.legalEntity}&rsquo;s name and logos are trademarks and
          service marks of {brand.legalEntity}. Other product and service
          names and logos used and displayed via the Service may be
          trademarks or service marks of their respective owners who may or
          may not endorse or be affiliated with or connected to{" "}
          {brand.legalEntity}. Nothing in this Terms of Service or the
          Service should be construed as granting, by implication, estoppel,
          or otherwise, any license or right to use any of{" "}
          {brand.legalEntity} Trademarks or Service Marks displayed on the
          Service, without our prior written permission in each instance.
          All goodwill generated from the use of {brand.legalEntity}{" "}
          Trademarks will inure to our exclusive benefit.
        </p>

        <SubHeading>Termination</SubHeading>
        <p>
          You may stop using {brand.name} and request account deletion.{" "}
          {brand.name} may restrict or terminate access for policy
          violations, fraud, safety concerns, nonpayment, legal
          requirements, or material platform risk.
        </p>

        <SubHeading>Governing Law</SubHeading>
        <p>
          These Terms are governed by the laws of the State of Georgia,
          without regard to conflict-of-law rules.
        </p>

        <SubHeading>Dispute Resolution Through Binding Arbitration</SubHeading>
        <p>
          <strong>PLEASE READ THIS SECTION CAREFULLY AS IT AFFECTS YOUR RIGHTS.</strong>
        </p>

        <h4 className="mt-4 mb-2 text-sm font-semibold tracking-tight text-foreground">
          Agreement to Arbitrate
        </h4>
        <p>
          This Dispute Resolution by Binding Arbitration section is
          referred to in this Terms of Service as the &ldquo;Arbitration
          Agreement.&rdquo; You agree that any and all disputes or claims
          that have arisen or may arise between you and {brand.legalEntity}{" "}
          whether arising out of or relating to this Terms of Service
          (including any alleged breach thereof), the Services, any
          advertising, any aspect of the relationship or transactions
          between us, shall be resolved exclusively through final,
          confidential, and binding arbitration, rather than a court, in
          accordance with the terms of this Arbitration Agreement, except
          that you may assert individual claims in small claims court, if
          your claims qualify. Further, this Arbitration Agreement does not
          preclude you from bringing issues to the attention of federal,
          state, or local agencies, and such agencies can, if the law
          allows, seek relief against us on your behalf. You agree that, by
          entering into this Terms of Service, you and {brand.legalEntity}{" "}
          are each waiving the right to a trial by jury and/or to
          participate in a class action. Your rights will be determined by
          a neutral arbitrator, not a judge or jury. The Federal
          Arbitration Act governs the interpretation and enforcement of
          this Arbitration Agreement.
        </p>

        <h4 className="mt-4 mb-2 text-sm font-semibold tracking-tight text-foreground">
          Prohibition of Class and Representative Actions and Non-Individualized Relief
        </h4>
        <p>
          <strong>
            YOU AND {brand.legalEntity.toUpperCase()} AGREE THAT EACH OF US
            MAY BRING CLAIMS AGAINST THE OTHER ONLY ON AN INDIVIDUAL BASIS
            AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS
            OR REPRESENTATIVE ACTION OR PROCEEDING. UNLESS BOTH YOU AND{" "}
            {brand.legalEntity.toUpperCase()} AGREE OTHERWISE IN WRITING,
            THE ARBITRATOR MAY NOT CONSOLIDATE OR JOIN MORE THAN ONE
            PERSON&rsquo;S OR PARTY&rsquo;S CLAIMS AND MAY NOT OTHERWISE
            PRESIDE OVER ANY FORM OF A CONSOLIDATED, REPRESENTATIVE, OR
            CLASS PROCEEDING. ALSO, THE ARBITRATOR MAY AWARD RELIEF
            (INCLUDING MONETARY, INJUNCTIVE, AND DECLARATORY RELIEF) ONLY
            IN FAVOR OF THE INDIVIDUAL PARTY SEEKING RELIEF AND ONLY TO
            THE EXTENT NECESSARY TO PROVIDE RELIEF NECESSITATED BY THAT
            PARTY&rsquo;S INDIVIDUAL CLAIM(S), EXCEPT THAT YOU MAY PURSUE A
            CLAIM FOR AND THE ARBITRATOR MAY AWARD PUBLIC INJUNCTIVE
            RELIEF UNDER APPLICABLE LAW TO THE EXTENT REQUIRED FOR THE
            ENFORCEABILITY OF THIS PROVISION.
          </strong>
        </p>

        <h4 className="mt-4 mb-2 text-sm font-semibold tracking-tight text-foreground">
          Pre-Arbitration Dispute Resolution
        </h4>
        <p>
          {brand.legalEntity} is always interested in resolving disputes
          amicably and efficiently, and most customer concerns can be
          resolved quickly and to the customer&rsquo;s satisfaction by
          emailing customer support at <Mail address={SUPPORT_EMAIL} />. If
          such efforts prove unsuccessful, a party who intends to seek
          arbitration must first send to the other, by certified mail, a
          written Notice of Dispute (&ldquo;Notice&rdquo;). Please e-mail us
          and we will promptly provide an address (&ldquo;Notice
          Address&rdquo;) to which you can address postal mail. The Notice
          must (i) describe the nature and basis of the claim or dispute
          and (ii) set forth the specific relief sought. If AND ONLY IF{" "}
          {brand.legalEntity} and you do not resolve the claim stated in
          the Notice within sixty (60) calendar days after the Notice is
          received, you and/or {brand.legalEntity} may commence an
          arbitration proceeding. During the arbitration, the amount of
          any settlement offer made by {brand.legalEntity} or you shall
          not be disclosed to the arbitrator until after the arbitrator
          determines the amount, if any, to which you or{" "}
          {brand.legalEntity} is entitled.
        </p>

        <h4 className="mt-4 mb-2 text-sm font-semibold tracking-tight text-foreground">
          Arbitration Procedures
        </h4>
        <p>
          Arbitration will be conducted by a neutral arbitrator in
          accordance with the American Arbitration Association&rsquo;s
          (&ldquo;AAA&rdquo;) rules and procedures, including the
          AAA&rsquo;s Consumer Arbitration Rules (collectively, the
          &ldquo;AAA Rules&rdquo;), as modified by this Arbitration
          Agreement. For information on the AAA, please visit its website,{" "}
          <ExternalLink href="http://www.adr.org">http://www.adr.org</ExternalLink>.
          Information about the AAA Rules and fees for consumer disputes
          can be found at the AAA&rsquo;s consumer arbitration page,{" "}
          <ExternalLink href="http://www.adr.org/consumer_arbitration">
            http://www.adr.org/consumer_arbitration
          </ExternalLink>
          . If there is any inconsistency between any term of the AAA Rules
          and any term of this Arbitration Agreement, the applicable terms
          of this Arbitration Agreement will control unless the arbitrator
          determines that the application of the inconsistent Arbitration
          Agreement terms would not result in a fundamentally fair
          arbitration. You agree the arbitrator must also follow the
          provisions of these Terms of Service as a court would. All issues
          are for the arbitrator to decide, including, but not limited to,
          issues relating to the scope, enforceability, and arbitrability
          of this Arbitration Agreement. Although arbitration proceedings
          are usually simpler and more streamlined than trials and other
          judicial proceedings, the arbitrator can award the same damages
          and relief on an individual basis that a court can award to an
          individual under the Terms of Service and applicable law.
          Decisions by the arbitrator are enforceable in court and may be
          overturned by a court only for very limited reasons.
        </p>
        <p>
          Unless {brand.legalEntity} and you agree otherwise in writing,
          any arbitration hearings will take place in Forsyth County,
          Georgia (for venue purposes) and pursuant to Georgia Law. The
          right to a hearing will be determined by the AAA Rules.
          Regardless of the manner in which the arbitration is conducted,
          the arbitrator shall issue a reasoned written decision sufficient
          to explain the essential findings and conclusions on which the
          award is based.
        </p>
        <p>
          You agree that regardless of any statute or law to the contrary,
          any claim or cause of action arising out of or related to use of
          the Service or these Terms of Service must be filed within one
          (1) year after such claim or cause of action arose or any and
          all claim(s) will be forever barred. A printed version of this
          agreement and of any notice given in electronic form will be
          admissible in judicial or administrative proceedings based upon
          or relating to this agreement to the same extent and subject to
          the same conditions as other business documents and records
          originally generated and maintained in printed form. You may not
          assign this Terms of Service without the prior written consent of{" "}
          {brand.legalEntity}, but we may assign or transfer this Terms of
          Service, in whole or in part, without restriction. The section
          titles in these Terms of Service are for convenience only and
          have no legal or contractual effect. Notices to you may be made
          via either email or regular mail. The Service may also provide
          notices to you of changes to these Terms of Service or other
          matters by displaying notices or links to notices generally on
          the Service.
        </p>

        <h4 className="mt-4 mb-2 text-sm font-semibold tracking-tight text-foreground">
          Costs of Arbitration
        </h4>
        <p>
          Payment of all filing, administration, and arbitrator fees
          (collectively, the &ldquo;Arbitration Fees&rdquo;) will be
          governed by the AAA Rules, unless otherwise provided in this
          Arbitration Agreement. Any payment of attorneys&rsquo; fees will
          be governed by the AAA Rules.
        </p>

        <h4 className="mt-4 mb-2 text-sm font-semibold tracking-tight text-foreground">
          Confidentiality
        </h4>
        <p>
          All aspects of the arbitration proceeding, and any ruling,
          decision, or award by the arbitrator, will be strictly
          confidential for the benefit of all parties.
        </p>

        <h4 className="mt-4 mb-2 text-sm font-semibold tracking-tight text-foreground">
          Severability
        </h4>
        <p>
          If a court or the arbitrator decides that any term or provision
          of this Arbitration Agreement (other than the subsection titled
          &ldquo;Prohibition of Class and Representative Actions and
          Non-Individualized Relief&rdquo; above) is invalid or
          unenforceable, the parties agree to replace such term or
          provision with a term or provision that is valid and enforceable
          and that comes closest to expressing the intention of the invalid
          or unenforceable term or provision, and this Arbitration
          Agreement shall be enforceable as so modified. If a court or the
          arbitrator decides that any of the provisions of the subsection
          above titled &ldquo;Prohibition of Class and Representative
          Actions and Non-Individualized Relief&rdquo; are invalid or
          unenforceable, then the entirety of this Arbitration Agreement
          shall be null and void, unless such provisions are deemed to be
          invalid or unenforceable solely with respect to claims for public
          injunctive relief. The remainder of the Terms of Service will
          continue to apply.
        </p>

        <h4 className="mt-4 mb-2 text-sm font-semibold tracking-tight text-foreground">
          Future Changes to Arbitration Agreement
        </h4>
        <p>
          Notwithstanding any provision in this Terms of Service to the
          contrary, {brand.legalEntity} agrees that if it makes any future
          change to this Arbitration Agreement (other than a change to the
          Notice Address) while you are a user of the Services, you may
          reject any such change by sending {brand.legalEntity} written
          notice within thirty (30) calendar days of the change to the
          Notice Address provided above. By rejecting any future change,
          you are agreeing that you will arbitrate any dispute between us
          in accordance with the language of this Arbitration Agreement as
          of the date you first accepted these Terms of Service (or
          accepted any subsequent changes to these Terms of Service).
        </p>

        <SubHeading>Changes</SubHeading>
        <p>
          We may update these Terms. The Last Updated date will identify
          the latest version. Additional notice will be provided when
          required by law.
        </p>

        <SubHeading>General</SubHeading>
        <p>
          These Terms of Service constitute the entire agreement between
          you and {brand.legalEntity} and govern your use of the Service,
          superseding any prior agreements between you and{" "}
          {brand.legalEntity} with respect to the Service. You also may be
          subject to additional terms and conditions that may apply when
          you use affiliate or third-party services, third party content or
          third-party software in conjunction with, or separately from, the
          Services.
        </p>
        <p>
          The failure of {brand.legalEntity} to exercise or enforce any
          right or provision of these Terms of Service will not constitute
          a waiver of such right or provision.
        </p>
      </LegalSection>

      {/* 2. Privacy Policy — sub-anchor #privacy-choices lives here */}
      <LegalSection id="privacy" title="2. Privacy Policy">
        <p>
          This Privacy Policy explains how {brand.name} collects, uses,
          shares, retains, and protects information.
        </p>
        <p>
          We collect the following categories of Personal Data from you
          when you use our Service, including when you sign up for an
          account, create or share content, and message or communicate with
          others:
        </p>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            <strong>Information you provide:</strong> We collect content,
            communications, and other information you provide, including
            when you sign up for an account, create or share content, and
            message or communicate with others. To create and manage an
            account, you may provide us with personal data, including your
            name, phone number, a photo and/or video of yourself, an email
            address, and a username. We use your contact information to
            authenticate your account and keep it secure and to communicate
            with you about the Service.
          </li>
          <li>
            <strong>Audio and Video:</strong> Solely for the purpose of
            supporting incident investigations, we may temporarily record
            the audio/video transmitted on the Service. If a user reports a
            violation of the Terms of Service, we retain the audio/video
            for the purposes of investigating the incident.
          </li>
          <li>
            <strong>Networks and connections:</strong> We collect information
            about the people, accounts, and networks you are connected to
            and how you interact with them through our Service. If you
            choose to upload, sync, or import any device information to{" "}
            {brand.name} (such as contacts in your address book), we may
            use this information in various ways, including, but not
            limited to, notifying you when a contact has joined the Service.
            In addition, other users who have your contact information and
            have chosen to upload, sync, or import it from their device may
            be notified of when you join our Service (e.g., so they can
            contact you through the Service); they may be able to know the
            number of people on the Service who have your number in their
            uploaded contacts, so that they can choose to invite people
            with many friends already on the Service. Finally, we may use
            your list of contacts (if you choose to provide us with access
            to them) to recommend other users you might want to follow and
            to recommend your account and content to others.
          </li>
          <li>
            <strong>Usage:</strong> We may choose to collect information
            about how you use our Service, such as the types of
            communications you engage in, content you share, features you
            use, actions you take, people or accounts you interact with,
            and the time, frequency, and duration of your use.
          </li>
          <li>
            <strong>Communication Data:</strong> We may choose to collect
            information when you contact us with questions or concerns and
            when you voluntarily respond to requests for your opinion and
            feedback.
          </li>
          <li>
            <strong>Social Media Data:</strong> We may have pages on social
            media sites like Instagram, Facebook, Medium, X, TikTok, and
            LinkedIn (&ldquo;Social Media Pages&rdquo;). When you interact
            with our Social Media Pages, we will collect Personal Data that
            you elect to provide to us, such as your contact details. In
            addition, the companies that host our Social Media Pages may
            provide us with aggregate information and analytics regarding
            the use of our Social Media Pages.
          </li>
          <li>
            <strong>Payment Information:</strong> We may offer certain
            portions of the Service for a fee or allow you to transact with
            other users on the Service. If applicable, we may prompt you to
            provide financial information necessary to ensure payments can
            be processed by our payment processor. Accordingly, in addition
            to this Privacy Policy and our Terms of Service, information
            related to your payments or purchases is also processed
            according to the third-party payment processor&rsquo;s terms of
            service and/or privacy policy.
          </li>
        </ul>
        <p>
          <strong>Internet Activity Data:</strong> When you visit, use, and
          interact with the Service, we may receive certain information
          about your visit, use, or interactions. For example, we may
          monitor the number of people that visit the Service, peak hours
          of visits, which page(s) are visited, the domains our visitors
          come from (e.g., google.com, yahoo.com, etc.), and which browsers
          people use to access the Service (e.g., Chrome, Firefox,
          Microsoft Internet Explorer, etc.), geographical information,
          and navigation patterns. In particular, the following information
          is created and automatically logged in our systems:
        </p>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            <strong>Log Data:</strong> Information that your browser
            automatically sends whenever you visit the application or
            website. Log Data includes your Internet Protocol address,
            browser type and settings, operating system, the date and time
            of your request, how you interacted with the Site, and how you
            interacted with mobile or email notifications.
          </li>
          <li>
            <strong>Device Data:</strong> Includes name of the device,
            operating system, and browser you are using. Information
            collected may depend on the type of device you use and its
            settings.
          </li>
          <li>
            <strong>Usage Data:</strong> We collect information about how
            you use our Service, such as the types of content that you view
            or engage with, the features you use, the actions you take, and
            the time, frequency, and duration of your activities.
          </li>
          <li>
            <strong>Location Data:</strong> We may derive a rough estimate
            of your location from your IP address.
          </li>
          <li>
            <strong>Email Open/Click Data:</strong> We may use pixels in
            email campaigns that allow us to collect your email and IP
            address as well as the date and time you open an email or
            click on any links in the email.
          </li>
        </ul>

        <SubHeading>Personal Data Collected from Third Parties / Publicly Available Sources</SubHeading>
        <p>
          When you create your account, and/or authenticate with a
          third-party service like TikTok or Instagram, we may collect,
          store, and periodically update information associated with that
          third-party account, such as your lists of friends or followers.
          We will never publish something through one of your third-party
          accounts without your express permission.
        </p>

        <SubHeading>Derived Data</SubHeading>
        <p>
          We may infer your preferences for content and features of the
          Service, or future products and services, based on the Personal
          Data we collect about you.
        </p>

        <SubHeading>Cookies</SubHeading>
        <p>
          We may use cookies to operate and administer our Services, gather
          usage data on our Site or Application, and improve your experience
          on it. &ldquo;Cookies&rdquo; are small text files containing a
          string of characters that can be placed on your computer or
          mobile device that uniquely identifies your browser or device.
          Cookies can be stored on your computer or mobile device for
          different periods of time. Some cookies expire after a certain
          amount of time, or upon logging out (session cookies), others
          survive after your browser is closed until a defined expiration
          date set in the cookie (as determined by the third party placing
          it) and help recognize your computer or mobile device when you
          open your browser and browse the Internet again (persistent
          cookies).
        </p>
        <p>
          Cookies and other technologies allow a site or services to know
          if your computer or device has visited it before. These
          technologies can then be used to deliver products, services, and
          ads, help us understand how the site or service is being used,
          help you navigate between pages efficiently, help remember your
          preferences, and generally improve your experience in using our
          services. If you limit the ability of websites to set cookies,
          you may be unable to access certain parts of the Site and you
          may not be able to benefit from the full functionality of the
          Site.
        </p>
        <p>
          Advertising networks may use cookies to collect Personal Data.
          Most advertising networks offer you a way to opt out of targeted
          advertising. If you would like to find out more information,
          please visit the Network Advertising Initiative&rsquo;s online
          resources at{" "}
          <ExternalLink href="http://www.networkadvertising.org">
            http://www.networkadvertising.org
          </ExternalLink>{" "}
          and follow the opt-out instructions there.
        </p>
        <p>
          If you access the Site on your mobile device, you may not be
          able to control tracking technologies through the settings.
        </p>

        <SubHeading>Analytics</SubHeading>
        <p>
          We may use a web analytics service, such as Segment and Instabug.
          These products use cookies to help us analyze how users use the
          Site and Service and enhance your experience when you use the
          Site. For more information, visit:{" "}
          <ExternalLink href="https://segment.com/legal/terms/">
            https://segment.com/legal/terms/
          </ExternalLink>{" "}
          and{" "}
          <ExternalLink href="https://instabug.com/terms">
            https://instabug.com/terms
          </ExternalLink>
          .
        </p>

        <SubHeading>Online Tracking and Do Not Track Signals</SubHeading>
        <p>
          We and our third-party service providers may use cookies, pixels,
          or other tracking technologies to collect information about your
          browsing activities over time and across different websites
          following your use of the Site and use that information to send
          targeted advertisements. We make reasonable commercial efforts to
          recognize and support &ldquo;Do Not Track&rdquo; signals.
        </p>

        <SubHeading>How We Use Personal Data</SubHeading>
        <p>We may use Personal Data for the following purposes:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>To provide the Service;</li>
          <li>
            To create your account, facilitate network connections,
            recommend content, and further personalize the Service for you;
          </li>
          <li>To respond to your inquiries, comments, feedback, or questions;</li>
          <li>
            To send administrative information to you, for example,
            information regarding the Service and changes to our terms,
            conditions, and policies;
          </li>
          <li>To analyze how you interact with our Service;</li>
          <li>To maintain and improve the Service;</li>
          <li>To develop new products and services;</li>
          <li>To authenticate your account and keep it secure;</li>
          <li>To enforce our Terms of Service;</li>
          <li>
            To prevent spam, fraud, abuse, criminal activity, illegal
            activity, or misuses of our Service, and to ensure the security
            of our IT systems, architecture, and networks; and/or
          </li>
          <li>
            To comply with legal obligations and legal process and to
            protect our rights, privacy, safety, or property, and/or that
            of our affiliates, you, or other third parties.
          </li>
        </ul>

        <SubHeading>Aggregated Information</SubHeading>
        <p>
          We may aggregate Personal Data and use the aggregated information
          to analyze the effectiveness of our Service, to improve and add
          features to our Service, and for other similar purposes. In
          addition, from time to time, we may analyze the general behavior
          and characteristics of users of our Service and share aggregated
          information like general user statistics with prospective business
          partners. We may collect aggregated information through the
          Service, through cookies, and through other means described in
          this Privacy Policy.
        </p>

        <SubHeading>Sharing and Disclosure of Personal Data</SubHeading>
        <p>
          In certain circumstances we may share the categories of Personal
          Data described above without further notice to you, unless
          required by the law, with the following categories of third
          parties:
        </p>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            <strong>Vendors and Service Providers:</strong> To assist us in
            meeting business operations needs and to perform certain
            services and functions, we may share Personal Data with vendors
            and service providers, including providers of hosting services,
            audio/video applications and infrastructure, cloud services,
            and other information technology services providers, event
            management services, email communication software and email
            newsletter services, advertising and marketing services,
            payment processors, customer relationship management and
            customer support services, and web analytics services. Pursuant
            to our instructions, these parties will access, process, or
            store Personal Data in the course of performing their duties to
            us. We take commercially reasonable steps to ensure our service
            providers adhere to the security standards we apply to your
            Personal Data.
          </li>
          <li>
            <strong>Business Transfers:</strong> If we are involved in a
            merger, acquisition, financing due diligence, reorganization,
            bankruptcy, receivership, sale of all or a portion of our
            assets, or transition of service to another provider
            (collectively a &ldquo;Transaction&rdquo;), your Personal Data
            and other information may be shared in the diligence process
            with counterparties and others assisting with the Transaction
            and transferred to a successor or affiliate as part of that
            Transaction along with other assets.
          </li>
          <li>
            <strong>Legal Requirements:</strong> If required to do so by law
            or in the good faith belief that such action is necessary to
            (i) comply with a legal obligation, including to meet national
            security or law enforcement requirements, (ii) protect and
            defend our rights or property, (iii) prevent fraud, (iv) act
            in urgent circumstances to protect the personal safety of
            users of the Service, or the public, or (v) protect against
            legal liability.
          </li>
          <li>
            <strong>Other Users:</strong> certain actions you take may be
            visible to other users of the Service. For example, when you
            upload videos or update information in your profile in the
            Service, other users will have access to this content and
            information.
          </li>
        </ul>

        <SubHeading>Data Retention</SubHeading>
        <p>
          We keep Personal Data for as long as reasonably necessary for the
          purposes described in this Privacy Policy, while we have a
          business need to do so, or as required by law (e.g. for tax,
          legal, accounting, or other purposes), whichever is longer.
        </p>

        <SubHeading>Update Your Information</SubHeading>
        <p>
          Please log in to your account or contact us if you need to change
          or correct your Personal Data, or if you wish to delete your
          account.
        </p>

        <SubHeading>Information You Provide</SubHeading>
        <p>
          Depending on how you use {brand.name}, we may collect your name,
          email address, phone number, account credentials or authentication
          identifiers, profile information, favorites, notification choices,
          posts, comments, uploaded images, reports, support messages,
          business listing information, owner or representative information,
          verification materials, review materials, and transaction
          information.
        </p>

        <SubHeading>Information Collected Automatically</SubHeading>
        <p>
          We may collect device type, operating system, app version, IP
          address, usage events, search and listing activity, diagnostics,
          crash information, security events, and permitted identifiers. We
          collect precise or approximate location only when the app uses
          that feature and the user permits it.
        </p>

        <SubHeading>How We Use Information</SubHeading>
        <p>
          We may use information to create and operate accounts; provide
          search, listings, favorites, posts, comments, notifications, and
          support; onboard and communicate with businesses; process paid
          services; verify information; conduct reviews; moderate content;
          prevent fraud and abuse; secure and troubleshoot {brand.name};
          analyze and improve performance; communicate service updates;
          comply with law; and enforce agreements.
        </p>

        <SubHeading>Service Providers and Sharing</SubHeading>
        <p>
          We may use third-party providers for hosting, databases,
          authentication, analytics, crash reporting, notifications, email,
          customer support, security, payments, and professional advice. We
          may also share information when a user intentionally contacts a
          business, when required to comply with law or protect safety and
          rights, or in connection with a corporate transaction. These
          Terms of Service are between you and us only, and not any
          third-party service provider. To the extent that you utilize any
          other third-party products and services in connection with your
          use of our Services, you agree to comply with all applicable
          terms of any agreement for such third-party products and
          services.
        </p>

        <SubHeading>Sale or Advertising Statement</SubHeading>
        <p>
          You consent to {brand.name} publishing, selling, or sharing your
          personal information for targeted advertising.
        </p>

        <SubHeading>Retention</SubHeading>
        <p>
          We retain information only for as long as reasonably needed for
          the purposes described in this policy, including service
          delivery, security, fraud prevention, contractual records,
          dispute resolution, legal compliance, and business operations.
        </p>

        <SubHeading>Security</SubHeading>
        <p>
          We use reasonable administrative, technical, and organizational
          measures intended to protect information. No system is completely
          secure, and we cannot guarantee absolute security.
        </p>
        <p>
          You use the Service at your own risk. You agree and acknowledge
          that we are a small-scale startup company and implement security
          features that are reasonable for a company of our size and
          resources. We implement reasonable measures, within our
          commercial capabilities at any given time, to protect Personal
          Data both online and offline from loss, misuse, and unauthorized
          access, disclosure, alteration, or destruction. However, no
          Internet or e-mail transmission is ever fully secure or error
          free. Further, content to or from the Service, and/or information
          and Personal Data held by us, may not be fully secure. Therefore,
          you should take special care in deciding what information you
          send to us via the Service or e-mail. Please keep this in mind
          when disclosing any Personal Data to the Company via the Internet
          and/or the Service.
        </p>

        {/* Sub-anchor targeted directly by the mobile Privacy screen
            (Linking to /legal#privacy-choices). scroll-mt-24 inline so
            the deep-link doesn't tuck under the sticky marketing nav. */}
        <h3
          id="privacy-choices"
          className="mt-6 mb-2 scroll-mt-24 text-base font-semibold tracking-tight text-foreground"
        >
          Your Choices
        </h3>
        <p>
          You may update certain account information, manage notifications
          and device permissions, edit or delete your own posts where
          supported, opt out of optional marketing communications, and
          request access, correction, or deletion of personal information
          by using the in-app controls or contacting{" "}
          <Mail address={SUPPORT_EMAIL} />.
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
          . A user-account deletion request applies to the login account
          and personal data associated with that account. It does not
          automatically cancel a separate business membership or remove an
          active business listing. {brand.name} may retain limited business,
          membership, transaction, security, fraud-prevention, contractual,
          dispute-resolution, or legally required records as described in
          this Privacy Policy. You agree that if you delete your account,
          we are not obligated to revive your account at any time.
        </p>

        <SubHeading>Children</SubHeading>
        <p>
          {brand.name} is not directed to children under 18, and we do not
          knowingly collect personal information from children under 18.
          Paid business services and legally binding business submissions
          are limited to adults.
        </p>

        <SubHeading>Changes and Contact</SubHeading>
        <p>
          We may update this policy and will change the Last Updated date.
          Privacy questions and requests may be sent to{" "}
          <Mail address={SUPPORT_EMAIL} />.
        </p>
      </LegalSection>

      {/* 3. Business Listing Disclaimer */}
      <LegalSection id="listing-disclaimer" title="3. Business Listing Disclaimer">
        <p>
          {brand.name} is a business discovery and information platform.
          Business names, descriptions, contact details, hours, services,
          prices, availability, photographs, credentials, licenses,
          insurance information, and other details may be provided by
          businesses, authorized representatives, users, public sources, or
          service providers.
        </p>
        <p>
          {brand.name} makes reasonable efforts to present useful
          information but does not guarantee that every listing is
          complete, current, accurate, lawful, licensed, insured, safe, or
          suitable for a particular purpose.
        </p>
        <p>
          Users should independently confirm important information directly
          with the business before visiting, booking, purchasing, paying,
          signing a contract, or relying on professional advice.
        </p>
        <p>
          Inclusion in {brand.name} does not mean that {brand.legalEntity}{" "}
          recommends, certifies, endorses, licenses, guarantees, or assumes
          responsibility for a business, its owners, employees, products,
          services, statements, or conduct.
        </p>
        <p>
          Any agreement, purchase, booking, payment, service, dispute, loss,
          injury, cancellation, or claim is between the user and the
          business unless a separate written agreement expressly states
          otherwise.
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
          {brand.name} may choose to identify paid placement with a
          &ldquo;Sponsored&rdquo; or &ldquo;Advertisement&rdquo; label near
          the listing or content. Sponsored placement affects visibility or
          presentation only. It does not mean that the business has
          received a higher quality rating, is endorsed by {brand.name}, is
          licensed or insured, or is guaranteed to provide satisfactory
          products or services.
        </p>
        <p>
          Different sponsorship levels may provide different visibility or
          promotional features. {brand.name} may reject, suspend, or remove
          sponsored content that is misleading, unlawful, unsafe,
          inconsistent with {brand.name} policies, or likely to harm users
          or platform integrity.
        </p>
        <p>
          Purchase of sponsorship does not guarantee impressions, clicks,
          inquiries, customers, sales, revenue, or business results.
        </p>
      </LegalSection>

      {/* 5. AIRA Verification */}
      <LegalSection id="verification" title={`5. ${brand.name} Verification`}>
        <p>
          An {brand.name} Verified badge means only that {brand.name}{" "}
          reviewed the specific identity or listing information described
          in the current verification process at the time of review.
        </p>
        <p>
          The badge does not guarantee service quality, safety, customer
          satisfaction, financial condition, insurance, legal compliance,
          licensing, or future conduct.
        </p>
        <p>
          Payment does not guarantee approval. {brand.name} may decline,
          suspend, expire, or remove a badge when information is
          incomplete, changes, expires, cannot be confirmed, or a credible
          complaint creates a material concern.
        </p>
        <p>
          Users should independently verify any credential important to
          their decision to contract with any business listed on{" "}
          {brand.name}.
        </p>
      </LegalSection>

      {/* 6. AIRA Stars & AIRA Review Policy */}
      <LegalSection
        id="aira-review"
        title={`6. ${brand.name} Stars & ${brand.name} Review Policy`}
      >
        <p>
          {brand.name} Reviews and {brand.name} Stars are paid evaluation
          services available only to business categories that {brand.name}{" "}
          chooses to evaluate. {brand.name} may decline to offer the service
          to certain businesses or categories.
        </p>
        <p>
          Before purchasing the service, the business will be informed
          about the evaluation process, applicable criteria, required
          information, fee, and publication terms. By purchasing the
          service, the business agrees that {brand.name} may publish the
          completed review and {brand.name} Stars whether the result is
          positive, neutral, or unfavorable.
        </p>
        <p>
          Before publication, {brand.name} will provide the business with a
          copy of the review to identify factual errors. The business may
          submit supporting information to request correction of factual
          inaccuracies but may not edit, negotiate, purchase, or influence{" "}
          {brand.name}&rsquo;s opinions, conclusions, or {brand.name} Stars.
        </p>
        <p>
          The review fee covers {brand.name}&rsquo;s time and evaluation
          work. The fee is non-refundable once {brand.name} begins the
          evaluation, including when the business disagrees with the review
          or rating. If {brand.name} determines before beginning the
          evaluation that the business is not eligible, {brand.name} will
          not charge the fee or will refund any amount already collected.
        </p>
        <p>
          Membership, sponsorship, advertising, or other payments do not
          improve or influence an {brand.name} Review or {brand.name} Stars.
        </p>
        <p>
          {brand.name} may delay or decline publication when required
          information is incomplete, the evaluation cannot be completed,
          publication may violate law, or safety, accuracy,
          conflict-of-interest, or integrity concerns exist, in our sole
          and exclusive discretion.
        </p>
        <p>
          Reviews reflect {brand.name}&rsquo;s observations and information
          available on the evaluation date. {brand.name} may update, expire,
          suspend, or remove a review when it becomes outdated, business
          conditions materially change, or credible new information affects
          its accuracy or reliability.
        </p>
        <p>
          {brand.name} Reviews are paid evaluation services. The business
          pays {brand.name} for the evaluation process. Payment does not
          guarantee a positive review or a specific number of {brand.name}{" "}
          Stars.
        </p>
      </LegalSection>

      {/* 7. Community Guidelines */}
      <LegalSection id="community" title="7. Community Guidelines">
        <p>
          {brand.name} is intended to be a respectful, useful, and
          trustworthy community. Users are responsible for the content they
          post.
        </p>
        <p>
          Do not post or engage in false or misleading information,
          harassment, threats, hate speech, obscene or sexually explicit
          content, spam, scams, impersonation, private personal
          information, copyright or trademark infringement, illegal offers,
          malware, fake reviews, rating manipulation, competitor attacks,
          or undisclosed paid promotions.
        </p>
        <p>
          Content should be relevant to the {brand.name} community and
          should not misrepresent personal experience, business ownership,
          employment, compensation, or another relationship that may affect
          credibility.
        </p>
        <p>
          Users may report content, comments, listings, or accounts that
          may violate these rules and may block another user where the
          feature is available.
        </p>
        <p>
          {brand.name} may review, limit, remove, preserve, or report
          content and may warn, suspend, or terminate accounts. We may
          retain information when reasonably needed for safety, fraud
          prevention, legal compliance, or dispute resolution.
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
          will not result in refund amounts already charged for a service
          period that has begun, except where required by law or expressly
          stated in the purchase terms.
        </p>

        <SubHeading>Work Already Started</SubHeading>
        <p>
          Fees for verification, review, content preparation, onboarding,
          or another service may become non-refundable after {brand.name}{" "}
          begins the work, provided that this condition was clearly
          disclosed before purchase.
        </p>

        <SubHeading>No Guaranteed Result</SubHeading>
        <p>
          A refund is not available merely because a listing, sponsorship,
          verification request, or review does not generate leads,
          customers, sales, approval, or a favorable rating.
        </p>

        <SubHeading>{brand.name}-Caused Non-Delivery</SubHeading>
        <p>
          If {brand.name} cannot provide a purchased service for reasons
          within its control, {brand.name} may provide a replacement
          service, service credit, or refund as stated in the applicable
          order terms.
        </p>

        <SubHeading>Policy Violations</SubHeading>
        <p>
          {brand.name} may suspend or remove services for false information,
          nonpayment, unlawful content, fraud, safety concerns, or
          violation of {brand.name} policies. The applicable purchase terms
          should state whether any unused amount is refundable.
        </p>

        <SubHeading>Refund Requests</SubHeading>
        <p>
          Refund requests must be sent to <Mail address={BILLING_EMAIL} />{" "}
          within 24 hours of the charge and must include the business name,
          purchaser name, service purchased, payment date, and reason for
          the request.
        </p>
        <p>
          All fees, service details, and applicable terms will be shown or
          communicated before payment. Except where required by law,
          refunds are provided according to the rules below.
        </p>

        <SubHeading>Business Membership</SubHeading>
        <p>
          A business may request cancellation and a full refund within 24
          hours of payment and only before {brand.name} begins creating or
          activating the business listing.
        </p>
        <p>
          Once listing setup has started or the listing has been published,
          the membership fee is non-refundable. The listing will remain
          active until the end of the purchased membership period unless it
          is removed earlier for a policy violation or at the business&rsquo;s
          request.
        </p>
        <p>
          Memberships do not automatically renew unless expressly stated at
          the time of purchase. If a membership is not renewed, the listing
          will be removed after the membership expires.
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
          may, at its discretion, allow the sponsorship to be rescheduled
          or transferred to another available placement.
        </p>
        <p>
          If {brand.name} is unable to provide the agreed sponsorship,{" "}
          {brand.name} may reschedule it or provide an equivalent
          sponsorship credit.
        </p>

        <SubHeading>{brand.name} Review Renewal or Update</SubHeading>
        <p>
          An {brand.name} Review renewal or update is a separate paid
          service.
        </p>
        <p>
          All renewal and update payments are final and non-refundable. The
          fee covers {brand.name}&rsquo;s new evaluation of the business
          based on current information and conditions.
        </p>
        <p>
          The updated review may result in the same, higher, or lower
          number of {brand.name} Stars. Payment does not guarantee that the
          previous review or rating will remain unchanged.
        </p>
        <p>
          No refund will be issued if the business withdraws, fails to
          provide required information, or disagrees with the updated
          review or rating.
        </p>

        <SubHeading>Custom Services</SubHeading>
        <p>
          Refund and cancellation terms for custom services will be stated
          in the applicable proposal, invoice, or written agreement.
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
          If {brand.name} confirms that a business was charged more than
          once or charged an incorrect amount, {brand.name} will correct
          the error or refund only the duplicated or incorrect amount.
        </p>
        <p>
          Approved refunds will be returned to the original payment method
          whenever possible. Processing times may vary depending on the
          bank or payment provider.
        </p>
        <p>
          Payment-error requests must be submitted to{" "}
          <Mail address={PAYMENT_SUPPORT_EMAIL} /> with the business name,
          service purchased, payment date, payment receipt, and a
          description of the error.
        </p>
      </LegalSection>

      {/* 9. Account & Data Deletion (incl. Copyright / DMCA) */}
      <LegalSection id="deletion" title="9. Account & Data Deletion">
        <p>
          Business memberships and business listings are administered
          separately from user login accounts. When a business purchases an{" "}
          {brand.name} membership, {brand.name} may associate an owner
          email address with the business listing. If that owner creates a
          user account, the user may view the linked business listing
          through the account.
        </p>
        <p>
          Deleting the linked user account does not cancel an active
          business membership and does not remove the business listing. The
          deleted user will lose login access to the listing, but the
          listing will continue to appear on {brand.name} until the current
          membership period ends.
        </p>
        <p>
          Before a membership expires, {brand.name} may contact the
          business owner or authorized representative regarding renewal. If
          the membership is renewed, the listing continues for the renewed
          period. If the membership is not renewed, the listing is removed
          after the membership expires according to {brand.name}&rsquo;s
          administrative process.
        </p>
        <p>
          {brand.name} may retain business-owner contact details, membership
          information, payment records, and other business records needed
          to administer the active membership, process renewal or
          expiration, maintain accurate business records, prevent fraud,
          resolve disputes, or comply with law. These records are handled
          separately from the deleted user login account.
        </p>
        <p>
          Deleting a user account does not automatically cancel a separate
          business membership, or payment obligation unless {brand.name}{" "}
          expressly confirms otherwise.
        </p>

        <SubHeading>Copyright Complaints</SubHeading>
        <p>
          {brand.legalEntity} respects the intellectual property of others,
          and we ask our users to do the same. If you believe that your
          work has been copied in a way that constitutes copyright
          infringement, or that your intellectual property rights have been
          otherwise violated, you should notify {brand.legalEntity} of your
          infringement claim in accordance with the procedure set forth
          below.
        </p>
        <p>
          {brand.legalEntity} will process and investigate notices of
          alleged infringement and will take appropriate actions under the
          Digital Millennium Copyright Act (&ldquo;DMCA&rdquo;) and other
          applicable intellectual property laws with respect to any alleged
          or actual infringement. A notification of claimed copyright
          infringement should be emailed to {brand.legalEntity} at{" "}
          <Mail address={SUPPORT_EMAIL} /> (Subject line: &ldquo;DMCA
          Takedown Request&rdquo;).
        </p>
        <p>To be effective, the notification must be in writing and contain the following information:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            an electronic or physical signature of the person authorized to
            act on behalf of the owner of the copyright or other
            intellectual property interest;
          </li>
          <li>
            a detailed description of the copyrighted work or other
            intellectual property that you claim has been infringed;
          </li>
          <li>
            a description of where the material that you claim is
            infringing is located on the Service, with enough detail that
            we may find it on the Service;
          </li>
          <li>your address, telephone number, and email address;</li>
          <li>
            a statement by you that you have a good faith belief that the
            disputed use is not authorized by the copyright or intellectual
            property owner, its agent, or the law; and
          </li>
          <li>
            a statement by you, made under penalty of perjury, that the
            above information in your Notice is accurate and that you are
            the copyright or intellectual property owner or authorized to
            act on the copyright or intellectual property owner&rsquo;s
            behalf.
          </li>
        </ul>
      </LegalSection>

      {/* 10. Contact — anchor preserved even though the source policy
          folds contact into the header. Kept as a scannable closer so
          the TOC's 10th entry has a target. */}
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
