"use client"

// Next.js App Router error boundary. Must be a client component per
// the route convention.

import Link from "next/link"
import { useEffect } from "react"
import { brand } from "@mlabs/config"
import { Button, buttonVariants } from "@mlabs/ui-web/button"
import { cn } from "@mlabs/ui-web/utils"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the error in dev consoles so it doesn't get swallowed.
    // Production telemetry is the consumer of error.digest.
    console.error(error)
  }, [error])

  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, color-mix(in oklch, var(--color-destructive) 8%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md text-center">
        <Link
          href="/"
          className="mb-10 inline-flex items-center justify-center gap-2"
        >
          <span className="inline-block size-2.5 rounded-full bg-primary" />
          <span className="text-lg font-extrabold tracking-tight">
            {brand.name}
          </span>
        </Link>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-destructive">
          Something went wrong
        </div>
        <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tighter">
          That&apos;s on us
        </h1>
        <p className="mt-4 text-muted-foreground">
          We hit an unexpected error. Try again, or head back home and
          we&apos;ll keep an eye out.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            Reference · {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => reset()} className="h-11 px-6">
            Try again
          </Button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "h-11 px-6"
            )}
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
