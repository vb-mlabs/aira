import Link from "next/link"
import { brand } from "@mlabs/config"
import { buttonVariants } from "@mlabs/ui-web/button"
import { cn } from "@mlabs/ui-web/utils"
import { Tagline } from "./tagline"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--color-primary) 10%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-20 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-[12px] font-medium text-primary ring-1 ring-primary/25">
          <span className="inline-block size-1.5 rounded-full bg-primary" />
          Internal · the MLabs way to build MVP features
        </div>

        <h1 className="text-balance text-5xl font-extrabold leading-[0.98] tracking-tighter sm:text-6xl md:text-7xl">
          <Tagline text={brand.tagline} highlight={brand.taglineHighlight} />.
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">mstack</span> is
          four Claude Code skills —{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[14px]">
            /mlabs-plan
          </code>{" "}
          →{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[14px]">
            /mlabs-review
          </code>{" "}
          →{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[14px]">
            /mlabs-code
          </code>{" "}
          →{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[14px]">
            /mlabs-qa
          </code>{" "}
          — that take a feature from idea to shipped code without
          vibe-coding it. They run against this template, so every MVP we
          ship looks the same way.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#why"
            className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-[14px]")}
          >
            Why mstack
          </Link>
          <Link
            href="#mstack"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "h-11 px-6 text-[14px]"
            )}
          >
            See the flow
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <CheckIcon className="text-primary" /> Plan before code
          </span>
          <span className="inline-flex items-center gap-2">
            <CheckIcon className="text-primary" /> Review before merge
          </span>
          <span className="inline-flex items-center gap-2">
            <CheckIcon className="text-primary" /> One commit per task
          </span>
          <span className="inline-flex items-center gap-2">
            <CheckIcon className="text-primary" /> QA before ship
          </span>
        </div>

        <div className="mx-auto mt-6 inline-flex max-w-md items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 px-5 py-3 text-[13px] text-foreground/80">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect width="14" height="20" x="5" y="2" rx="2" />
              <path d="M12 18h.01" />
            </svg>
          </span>
          <span>
            <span className="font-semibold text-foreground">Web + mobile out of the box.</span>{" "}
            Next.js (
            <code className="font-mono text-[12px]">apps/web</code>) and
            Expo (
            <code className="font-mono text-[12px]">apps/mobile</code>)
            share auth, validators, and config.
          </span>
        </div>
      </div>
    </section>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
