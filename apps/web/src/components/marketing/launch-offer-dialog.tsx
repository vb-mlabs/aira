"use client"

// Reusable "Founding Launch Offer" dialog — the pricing surface for the
// business-owner acquisition flow. Extracted from business-cta-pair.tsx so
// both the marketing hero (HeroV2) and the BusinessPanel can trigger the same
// modal with different trigger buttons. Mirrors the GetListedDialog signature
// (children + triggerClassName + triggerAriaLabel).
//
// Dialog uses @base-ui/react for focus trap + ESC handling. Content is the
// single source of truth for pricing shown to prospects; edit the constants
// below when membership tiers or add-ons change.

import { Star, Users, User, TrendingUp, ShieldCheck } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"

// ── Launch Offer data ─────────────────────────────────────────────────────────

const PERKS = [
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
    value: "$69",
  },
  {
    icon: <User className="size-4" />,
    iconBg: "bg-muted text-muted-foreground",
    title: "1-Year Membership",
    value: "$99",
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
      { label: "AIRA Review", value: "$199 initial" },
      { label: "Review Renewal", value: "$75/year" },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function LaunchOfferDialog({
  children,
  triggerClassName,
  triggerAriaLabel,
}: {
  children: React.ReactNode
  triggerClassName?: string
  triggerAriaLabel?: string
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        className={triggerClassName}
        aria-label={triggerAriaLabel}
      >
        {children}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[color:oklch(0.25_0.04_60_/_60%)] backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-32px)] w-[min(680px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-card shadow-[0_40px_80px_-20px_oklch(0.25_0.04_60_/_50%)] outline-none data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[transform,opacity] duration-200">
          <div className="overflow-y-auto px-7 py-4 text-card-foreground md:px-8">
            <Dialog.Title className="text-center font-display text-[22px] font-bold leading-tight text-foreground">
              Founding Launch Offer
            </Dialog.Title>

            <div className="mt-1.5 flex items-center gap-3">
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
              <Dialog.Description className="shrink-0 text-center text-[11.5px] font-medium tracking-[0.3px] text-muted-foreground">
                For businesses joining during launch week
              </Dialog.Description>
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
            </div>

            <ul className="mt-3 space-y-2">
              {PERKS.map((perk) => (
                <li key={perk.title} className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`flex size-[30px] flex-shrink-0 items-center justify-center rounded-full ${perk.iconBg}`}
                  >
                    {perk.icon}
                  </span>
                  <div className="leading-[1.4]">
                    <span className="font-sans text-[14px] font-extrabold text-foreground">
                      {perk.highlight}
                    </span>{" "}
                    <span className="font-sans text-[14px] font-bold text-foreground">
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

            <p className="mt-2 text-center text-[12px] leading-[1.5] text-muted-foreground">
              Available when you join with a 6-Month or 1-Year Membership
              during the launch period.
            </p>

            <hr className="my-3 border-border" />

            {/* Membership Plans */}
            <h3 className="text-center font-display text-[18px] font-bold text-foreground">
              Membership Plans
            </h3>
            <p className="mx-auto mt-1 max-w-[520px] text-center text-[12px] leading-[1.5] text-muted-foreground">
              Membership is required to list your business on AIRA and appear
              in regular category listings during the active plan period.
            </p>

            <ul className="mt-2 space-y-1.5">
              {MEMBERSHIP_PLANS.map((plan) => (
                <li
                  key={plan.title}
                  className="flex items-center gap-3 border-b border-border/60 pb-1.5 last:border-0"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-[30px] flex-shrink-0 items-center justify-center rounded-full ${plan.iconBg}`}
                  >
                    {plan.icon}
                  </span>
                  <span className="flex-1 font-sans text-[14px] font-bold text-foreground">
                    {plan.title}
                  </span>
                  <span className="font-sans text-[15px] font-extrabold text-foreground">
                    {plan.value}
                  </span>
                </li>
              ))}
            </ul>

            {/* Optional Add-Ons */}
            <div className="mt-3 flex items-center gap-3">
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
              <h3 className="shrink-0 font-display text-[16px] font-bold text-foreground">
                Optional Add-Ons
              </h3>
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {ADDON_COLUMNS.map((col) => (
                <div
                  key={col.heading}
                  className="flex flex-col items-center text-center"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  >
                    {col.icon}
                  </span>
                  <p className="mt-1 font-display text-[14px] font-bold text-foreground">
                    {col.heading}
                  </p>
                  <ul className="mt-1.5 w-full space-y-1 text-left">
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

            <div className="mt-4 flex justify-end">
              <Dialog.Close className="inline-flex items-center justify-center rounded-full border border-border bg-transparent px-6 py-[9px] font-sans text-sm font-bold tracking-[0.3px] text-foreground no-underline transition-colors hover:bg-muted">
                Close
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
