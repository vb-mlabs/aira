"use client"

// Dual CTA for the "For business owners" section:
//   1. "Get Listed Early" — primary cream pill → Dialog modal with sign-up form
//      (Full Name, Business Name, Phone, Email, preferred contact, preferred time)
//      POSTs to /api/v1/business-waitlist via apiClient. Success swaps form for
//      thank-you message.
//   2. "View Launch Offer" — secondary outlined pill → modal styled after the
//      Founding Launch Offer flyer: cream bg, italic title, perk rows, pricing grid.
//
// Both Dialogs are client-only islands so the surrounding section stays SSR.
// Dialog uses @base-ui/react for focus trap + ESC handling.

import { useState } from "react"
import {
  BadgeCheck,
  Star,
  Users,
  User,
  TrendingUp,
  ShieldCheck,
} from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { apiClient } from "@/lib/api-client"

// ── Launch Offer data ─────────────────────────────────────────────────────────

const PERKS = [
  {
    icon: <BadgeCheck className="size-4" />,
    iconBg: "bg-primary text-primary-foreground",
    highlight: "FREE",
    title: "AIRA Verified Badge",
  },
  {
    icon: <Star className="size-4" />,
    iconBg: "bg-brand-gold text-white",
    highlight: "FREE",
    title: "1 Month Featured Launch Placement",
  },
  {
    icon: <Users className="size-4" />,
    iconBg: "bg-primary text-primary-foreground",
    highlight: "+1 Extra Month",
    title: "Featured Placement",
    detail: "for each successful referral business that joins AIRA",
  },
]

const MEMBERSHIP_PLANS = [
  {
    icon: <User className="size-4" />,
    iconBg: "bg-muted text-muted-foreground",
    title: "6-Month Membership",
    value: "$149",
  },
  {
    icon: <User className="size-4" />,
    iconBg: "bg-muted text-muted-foreground",
    title: "1-Year Membership",
    value: "$229",
  },
]

const ADDON_COLUMNS = [
  {
    icon: <TrendingUp className="size-4" />,
    heading: "Sponsorship Level 1",
    items: [
      { label: "1 Month", value: "$50" },
      { label: "3 Months", value: "$120" },
      { label: "6 Months", value: "$210" },
    ],
  },
  {
    icon: <TrendingUp className="size-4" />,
    heading: "Sponsorship Level 2",
    items: [
      { label: "1 Month", value: "$35" },
      { label: "3 Months", value: "$85" },
      { label: "6 Months", value: "$135" },
    ],
  },
  {
    icon: <ShieldCheck className="size-4" />,
    heading: "Trust Features",
    items: [
      { label: "AIRA Verified Badge", value: "$99 one-time" },
      { label: "AIRA Business Review", value: "Included" },
      { label: "Review Renewal", value: "$75/year" },
    ],
  },
]

// ── Shared classes ────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"

const PILL_BASE =
  "flex-1 rounded-full border px-3 py-2 text-center text-[13px] font-semibold transition-colors cursor-pointer select-none"
const PILL_ACTIVE = "border-primary bg-primary text-primary-foreground"
const PILL_IDLE =
  "border-border bg-transparent text-foreground hover:bg-muted"

// ── Sign-up form component ────────────────────────────────────────────────────

function GetListedForm() {
  const [fields, setFields] = useState({
    full_name: "",
    business_name: "",
    phone: "",
    email: "",
    preferred_contact: "",
    preferred_time: "",
    _h: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await apiClient.post("/api/v1/business-waitlist", fields)
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again or email us directly.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground"
        >
          ✓
        </span>
        <h3 className="mt-4 font-display text-xl font-bold text-foreground">
          Request received!
        </h3>
        <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">
          We&apos;ll be in touch via your preferred contact channel shortly.
        </p>
        <Dialog.Close className="mt-6 inline-flex items-center justify-center rounded-full border border-border bg-transparent px-6 py-[11px] font-sans text-sm font-bold tracking-[0.3px] text-foreground transition-colors hover:bg-muted">
          Close
        </Dialog.Close>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Row: Full Name + Business Name */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="bwl-full-name"
            className="block text-[13px] font-semibold text-foreground"
          >
            Full Name
          </label>
          <input
            id="bwl-full-name"
            type="text"
            required
            autoComplete="name"
            placeholder="Jane Smith"
            value={fields.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            className={INPUT_CLS}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="bwl-business-name"
            className="block text-[13px] font-semibold text-foreground"
          >
            Business Name
          </label>
          <input
            id="bwl-business-name"
            type="text"
            required
            autoComplete="organization"
            placeholder="Acme Ltd"
            value={fields.business_name}
            onChange={(e) => set("business_name", e.target.value)}
            className={INPUT_CLS}
          />
        </div>
      </div>

      {/* Row: Phone + Email */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="bwl-phone"
            className="block text-[13px] font-semibold text-foreground"
          >
            Phone Number
          </label>
          <input
            id="bwl-phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+1 404 000 0000"
            value={fields.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={INPUT_CLS}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="bwl-email"
            className="block text-[13px] font-semibold text-foreground"
          >
            Email Address
          </label>
          <input
            id="bwl-email"
            type="email"
            required
            autoComplete="email"
            placeholder="jane@acme.com"
            value={fields.email}
            onChange={(e) => set("email", e.target.value)}
            className={INPUT_CLS}
          />
        </div>
      </div>

      {/* Best way to contact */}
      <fieldset>
        <legend className="mb-2 block text-[13px] font-semibold text-foreground">
          Best way to contact you
        </legend>
        <div className="flex gap-2">
          {(
            [
              { value: "phone", label: "Phone" },
              { value: "whatsapp", label: "WhatsApp" },
              { value: "email", label: "Email" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`${PILL_BASE} ${fields.preferred_contact === opt.value ? PILL_ACTIVE : PILL_IDLE}`}
            >
              <input
                type="radio"
                name="preferred_contact"
                value={opt.value}
                required
                checked={fields.preferred_contact === opt.value}
                onChange={() => set("preferred_contact", opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Best time to contact */}
      <fieldset>
        <legend className="mb-2 block text-[13px] font-semibold text-foreground">
          Best time to contact you
        </legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "morning", label: "Morning" },
              { value: "afternoon", label: "Afternoon" },
              { value: "evening", label: "Evening" },
              { value: "anytime", label: "Anytime" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`${PILL_BASE} ${fields.preferred_time === opt.value ? PILL_ACTIVE : PILL_IDLE}`}
            >
              <input
                type="radio"
                name="preferred_time"
                value={opt.value}
                required
                checked={fields.preferred_time === opt.value}
                onChange={() => set("preferred_time", opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Honeypot — hidden from real users */}
      <div style={{ display: "none" }} aria-hidden="true">
        <input
          type="text"
          name="_h"
          tabIndex={-1}
          autoComplete="off"
          value={fields._h}
          onChange={(e) => set("_h", e.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-1">
        <Dialog.Close className="inline-flex items-center justify-center rounded-full border border-border bg-transparent px-5 py-[10px] font-sans text-sm font-bold tracking-[0.3px] text-foreground transition-colors hover:bg-muted">
          Cancel
        </Dialog.Close>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-5 py-[10px] font-sans text-sm font-bold tracking-[0.3px] text-primary-foreground shadow-[var(--shadow-primary-glow)] transition-[transform,opacity] hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending…" : "Request Listing →"}
        </button>
      </div>
    </form>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function BusinessCtaPair() {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* ── Get Listed Early → sign-up form modal ── */}
      <Dialog.Root>
        <Dialog.Trigger className="inline-flex items-center gap-2 rounded-full bg-brand-cream-bright px-7 py-[14px] font-sans text-sm font-bold tracking-[0.3px] text-[color:oklch(0.42_0.06_130)] no-underline transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cream-bright focus-visible:ring-offset-2 focus-visible:ring-offset-[color:oklch(0.42_0.06_130)]">
          Get Listed Early →
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-[color:oklch(0.25_0.04_60_/_60%)] backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-32px)] w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-card shadow-[0_40px_80px_-20px_oklch(0.25_0.04_60_/_50%)] outline-none data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[transform,opacity] duration-200">
            <div className="overflow-y-auto px-8 py-7 text-card-foreground md:px-10">
              <span className="block text-[11px] font-bold uppercase tracking-[3px] text-brand-gold">
                Early access
              </span>
              <Dialog.Title className="mt-1.5 font-display text-[26px] font-bold italic leading-tight text-foreground">
                Get your business listed
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-[13px] text-muted-foreground">
                Fill in your details and we&apos;ll reach out to get you set up.
              </Dialog.Description>

              <div className="mt-6">
                <GetListedForm />
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── View Launch Offer → info modal ── */}
      <Dialog.Root>
        <Dialog.Trigger className="inline-flex items-center gap-2 rounded-full border border-brand-cream-bright/70 bg-transparent px-7 py-[14px] font-sans text-sm font-bold tracking-[0.3px] text-brand-cream-bright no-underline transition-[transform,background-color] hover:-translate-y-px hover:bg-brand-cream-bright/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cream-bright focus-visible:ring-offset-2 focus-visible:ring-offset-[color:oklch(0.42_0.06_130)]">
          View Launch Offer
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-[color:oklch(0.25_0.04_60_/_60%)] backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-32px)] w-[min(680px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-card shadow-[0_40px_80px_-20px_oklch(0.25_0.04_60_/_50%)] outline-none data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[transform,opacity] duration-200">
            <div className="overflow-y-auto px-7 py-5 text-card-foreground md:px-8">
              <Dialog.Title className="text-center font-display text-[26px] font-bold italic leading-tight text-foreground">
                Founding Launch Offer
              </Dialog.Title>

              <div className="mt-1.5 flex items-center gap-3">
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                <Dialog.Description className="shrink-0 text-center text-[11.5px] font-medium tracking-[0.3px] text-muted-foreground">
                  For businesses joining during launch week
                </Dialog.Description>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </div>

              <ul className="mt-4 space-y-2.5">
                {PERKS.map((perk) => (
                  <li key={perk.title} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex size-[34px] flex-shrink-0 items-center justify-center rounded-full ${perk.iconBg}`}
                    >
                      {perk.icon}
                    </span>
                    <div className="leading-[1.4]">
                      <span className="font-sans text-[14px] font-extrabold text-foreground">
                        {perk.highlight}
                      </span>{" "}
                      <span className="font-sans text-[14px] font-bold italic text-foreground">
                        {perk.title}
                      </span>
                      {perk.detail ? (
                        <p className="text-[12px] text-muted-foreground">
                          {perk.detail}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-center text-[12px] italic leading-[1.55] text-muted-foreground">
                Available when you join with a 6-Month or 1-Year Membership
                during the launch period.
              </p>

              <hr className="my-4 border-border" />

              {/* Membership Plans */}
              <h3 className="text-center font-display text-[21px] font-bold italic text-foreground">
                Membership Plans
              </h3>
              <p className="mx-auto mt-1 max-w-[520px] text-center text-[12.5px] leading-[1.55] text-muted-foreground">
                Membership is required to list your business on AIRA and
                appear in regular category listings during the active plan
                period.
              </p>

              <ul className="mt-3 space-y-2">
                {MEMBERSHIP_PLANS.map((plan) => (
                  <li
                    key={plan.title}
                    className="flex items-center gap-3 border-b border-border/60 pb-2 last:border-0"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-[34px] flex-shrink-0 items-center justify-center rounded-full ${plan.iconBg}`}
                    >
                      {plan.icon}
                    </span>
                    <span className="flex-1 font-sans text-[14px] font-bold italic text-foreground">
                      {plan.title}
                    </span>
                    <span className="font-sans text-[15px] font-extrabold text-foreground">
                      {plan.value}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Optional Add-Ons */}
              <div className="mt-4 flex items-center gap-3">
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                <h3 className="shrink-0 font-display text-[18px] font-bold italic text-foreground">
                  Optional Add-Ons
                </h3>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
                {ADDON_COLUMNS.map((col) => (
                  <div
                    key={col.heading}
                    className="flex flex-col items-center text-center"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
                    >
                      {col.icon}
                    </span>
                    <p className="mt-1.5 font-display text-[14.5px] font-bold italic text-foreground">
                      {col.heading}
                    </p>
                    <ul className="mt-2 w-full space-y-1.5 text-left">
                      {col.items.map((item) => (
                        <li
                          key={item.label}
                          className="flex items-baseline justify-between gap-2 border-b border-border/50 pb-1 last:border-0"
                        >
                          <span className="text-[12px] leading-[1.35] text-muted-foreground">
                            {item.label}
                          </span>
                          <span className="text-[13px] font-bold text-foreground">
                            {item.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <Dialog.Close className="inline-flex items-center justify-center rounded-full border border-border bg-transparent px-6 py-[11px] font-sans text-sm font-bold tracking-[0.3px] text-foreground no-underline transition-colors hover:bg-muted">
                  Close
                </Dialog.Close>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
