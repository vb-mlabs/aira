"use client"

// Dual CTA for the "For business owners" section:
//   1. "Get Listed Early" — primary cream pill → external Google Form
//   2. "Ask About Launch Offer" — secondary outlined pill → modal with offer
//
// Extracted into a client island so the surrounding section stays SSR.
// Dialog uses @base-ui/react (already a dep) for focus trap + ESC handling.
//
// TODO: replace GOOGLE_FORM_URL with the real form once it's set up.
// TODO: launch-offer copy is placeholder — edit OFFER_COPY when finalised.

import { Dialog } from "@base-ui/react/dialog"
import { brand } from "@aira/config"

const GOOGLE_FORM_URL = "https://forms.gle/REPLACE-ME"

const OFFER_COPY = {
  title: "Launch offer for early listings",
  lead: "Be one of our first listed businesses and we'll waive sponsored placement for your first 3 months — locked to your category before we open in Atlanta.",
  bullets: [
    "Verified badge from day one",
    "Sponsored placement (first 3 months) — free",
    "Locked category slot before public launch",
  ],
}

export function BusinessCtaPair() {
  const offerMailto = `mailto:${brand.supportEmail}?subject=Launch%20offer%20%E2%80%94%20AIRA%20listing`
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
          Ask About Launch Offer
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-[color:oklch(0.25_0.04_60_/_55%)] backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-card p-8 text-card-foreground shadow-[0_30px_60px_-20px_oklch(0.25_0.04_60_/_45%)] outline-none data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[transform,opacity] duration-200 md:p-10">
            <span className="block text-[11px] font-bold uppercase tracking-[3px] text-brand-gold">
              Launch offer
            </span>
            <Dialog.Title className="mt-2 font-display text-3xl font-bold leading-tight text-foreground md:text-[34px]">
              {OFFER_COPY.title}
            </Dialog.Title>
            <Dialog.Description className="mt-3 text-[16px] leading-[1.65] text-muted-foreground">
              {OFFER_COPY.lead}
            </Dialog.Description>
            <ul className="mt-5 space-y-2.5">
              {OFFER_COPY.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-[15px] text-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[3px] flex size-[20px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
                  >
                    ✓
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Dialog.Close className="inline-flex items-center justify-center rounded-full border border-border bg-transparent px-6 py-[12px] font-sans text-sm font-bold tracking-[0.3px] text-foreground no-underline transition-colors hover:bg-muted">
                Close
              </Dialog.Close>
              <a
                href={offerMailto}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-6 py-[12px] font-sans text-sm font-bold tracking-[0.3px] text-primary-foreground shadow-[var(--shadow-primary-glow)] no-underline transition-transform hover:-translate-y-px"
              >
                Email us to claim →
              </a>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
