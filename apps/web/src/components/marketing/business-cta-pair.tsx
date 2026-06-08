"use client"

// Dual CTA for the "For business owners" section:
//   1. "Get Listed Early" — primary cream pill → external Google Form
//   2. "View Launch Offer" — secondary outlined pill → modal styled after
//      the Founding Launch Offer flyer: cream bg, italic display title,
//      ruled subtitle, icon-led perk rows, Regular Plans pricing grid.
//
// TODO: replace GOOGLE_FORM_URL with the real form once it's set up.

import {
  BadgeCheck,
  Star,
  Users,
  User,
  TrendingUp,
  ShieldCheck,
} from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"

const GOOGLE_FORM_URL = "https://forms.gle/REPLACE-ME"

const PERKS = [
  {
    icon: <BadgeCheck className="size-5" />,
    iconBg: "bg-primary text-primary-foreground",
    highlight: "FREE",
    title: "AIRA Verified Badge",
  },
  {
    icon: <Star className="size-5" />,
    iconBg: "bg-brand-gold text-white",
    highlight: "FREE",
    title: "1 Month Featured Launch Placement",
  },
  {
    icon: <Users className="size-5" />,
    iconBg: "bg-primary text-primary-foreground",
    highlight: "+1 Extra Month",
    title: "Featured Placement",
    detail: "for each successful referral business that joins AIRA",
  },
]

const PLAN_COLUMNS = [
  {
    icon: <User className="size-5" />,
    heading: "Membership",
    items: [
      { label: "6-Month Membership", value: "$149" },
      { label: "1-Year Membership", value: "$229" },
    ],
  },
  {
    icon: <TrendingUp className="size-5" />,
    heading: "Sponsorship Level 1",
    items: [
      { label: "1 Month", value: "$50" },
      { label: "3 Months", value: "$120" },
      { label: "6 Months", value: "$210" },
    ],
  },
  {
    icon: <TrendingUp className="size-5" />,
    heading: "Sponsorship Level 2",
    items: [
      { label: "1 Month", value: "$35" },
      { label: "3 Months", value: "$85" },
      { label: "6 Months", value: "$135" },
    ],
  },
  {
    icon: <ShieldCheck className="size-5" />,
    heading: "Trust Features",
    items: [
      { label: "AIRA Verified Badge", value: "$99 one-time" },
      { label: "AIRA Business Review", value: "Included" },
      { label: "Review Renewal", value: "$75/year" },
    ],
  },
]

export function BusinessCtaPair() {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
      <a
        href={GOOGLE_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-brand-cream-bright px-7 py-[14px] font-sans text-sm font-bold tracking-[0.3px] text-[color:oklch(0.42_0.06_130)] no-underline transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cream-bright focus-visible:ring-offset-2 focus-visible:ring-offset-[color:oklch(0.42_0.06_130)]"
      >
        Get Listed Early →
      </a>

      <Dialog.Root>
        <Dialog.Trigger className="inline-flex items-center gap-2 rounded-full border border-brand-cream-bright/70 bg-transparent px-7 py-[14px] font-sans text-sm font-bold tracking-[0.3px] text-brand-cream-bright no-underline transition-[transform,background-color] hover:-translate-y-px hover:bg-brand-cream-bright/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cream-bright focus-visible:ring-offset-2 focus-visible:ring-offset-[color:oklch(0.42_0.06_130)]">
          View Launch Offer
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-[color:oklch(0.25_0.04_60_/_60%)] backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-32px)] w-[min(680px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-card shadow-[0_40px_80px_-20px_oklch(0.25_0.04_60_/_50%)] outline-none data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[transform,opacity] duration-200">
            <div className="overflow-y-auto px-8 py-7 text-card-foreground md:px-10">

              {/* Title */}
              <Dialog.Title className="text-center font-display text-[28px] font-bold italic leading-tight text-foreground md:text-[32px]">
                Founding Launch Offer
              </Dialog.Title>

              {/* Ruled subtitle */}
              <div className="mt-2 flex items-center gap-3">
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                <Dialog.Description className="shrink-0 text-center text-[12px] font-medium tracking-[0.3px] text-muted-foreground">
                  For businesses joining during launch week
                </Dialog.Description>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </div>

              {/* Perk rows */}
              <ul className="mt-5 space-y-3">
                {PERKS.map((perk) => (
                  <li key={perk.title} className="flex items-center gap-4">
                    <span
                      aria-hidden="true"
                      className={`flex size-[38px] flex-shrink-0 items-center justify-center rounded-full ${perk.iconBg}`}
                    >
                      {perk.icon}
                    </span>
                    <div className="leading-[1.4]">
                      <span className="font-sans text-[14px] font-extrabold text-foreground">
                        {perk.highlight}
                      </span>{" "}
                      <span className="font-sans text-[14px] font-semibold text-foreground">
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

              {/* Availability footnote */}
              <p className="mt-4 text-center text-[12px] italic leading-[1.6] text-muted-foreground">
                Available when you join with a 6-Month or 1-Year Membership
                during the launch period.
              </p>

              {/* Divider */}
              <hr className="my-5 border-border" />

              {/* Regular Plans */}
              <h3 className="text-center font-display text-[20px] font-bold text-foreground">
                Regular Plans
              </h3>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {PLAN_COLUMNS.map((col) => (
                  <div key={col.heading} className="flex flex-col items-center text-center">
                    {/* Column icon */}
                    <span
                      aria-hidden="true"
                      className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
                    >
                      {col.icon}
                    </span>
                    {/* Column heading */}
                    <p className="mt-2 text-[10.5px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
                      {col.heading}
                    </p>
                    {/* Price rows */}
                    <ul className="mt-3 w-full space-y-2 text-left">
                      {col.items.map((item) => (
                        <li
                          key={item.label}
                          className="flex items-baseline justify-between gap-1 border-b border-border/50 pb-1.5 last:border-0"
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

              {/* Actions */}
              <div className="mt-8 flex justify-end">
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
