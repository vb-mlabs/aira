import Link from "next/link"
import { brand } from "@mlabs/config"
import { buttonVariants } from "@mlabs/ui-web/button"
import { cn } from "@mlabs/ui-web/utils"

type MarketingNavProps = {
  signedIn?: boolean
}

export function MarketingNav({ signedIn = false }: MarketingNavProps) {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full bg-primary" />
          <span className="text-[19px] font-extrabold tracking-tight">
            {brand.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-9 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:flex">
          <Link href="#why" className="transition hover:text-foreground">
            Why
          </Link>
          <Link href="#mstack" className="transition hover:text-foreground">
            mstack
          </Link>
          <Link href="#packages" className="transition hover:text-foreground">
            Packages
          </Link>
          <Link href="#start" className="transition hover:text-foreground">
            Start
          </Link>
          <Link href="/design" className="transition hover:text-foreground">
            Design
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {signedIn ? (
            <Link
              href="/"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 px-6 text-[14px]"
              )}
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "hidden h-11 px-6 text-[14px] sm:inline-flex"
                )}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 px-6 text-[14px]"
                )}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
