import Link from "next/link"
import { brand } from "@mlabs/config"
import { buttonVariants } from "@mlabs/ui-web/button"
import { cn } from "@mlabs/ui-web/utils"

export default function NotFound() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, color-mix(in oklch, var(--color-primary) 8%, transparent) 0%, transparent 70%)",
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
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          404
        </div>
        <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tighter">
          Page not found
        </h1>
        <p className="mt-4 text-muted-foreground">
          The link is broken, the page moved, or it was never here.
          Either way — let&apos;s get you back.
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ size: "lg" }), "mt-8 h-11 px-6")}
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}
