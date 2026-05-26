// Auth shell — wraps /login, /signup, /forgot-password, /reset-password,
// /verify-email. Renders the tree-of-life logo header above the card and the
// "AIRA by Nisarga" attribution footer below it.
//
// The cream paper-grain background paints on <body> via --texture-paper in
// globals.css; we deliberately do NOT add a background-image here to avoid
// double-stacking the texture. The radial top-glow from the previous
// MLabs-template shell is removed — the paper grain is the atmosphere.

import Image from "next/image"
import Link from "next/link"
import { brand } from "@aira/config"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center px-6 py-12">
      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8">
        <Link
          href="/"
          aria-label={`${brand.name} home`}
          className="block"
        >
          <Image
            src="/marketing-images/logo.png"
            alt={`${brand.name} logo`}
            width={80}
            height={80}
            priority
          />
        </Link>
        <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.18)]">
          {children}
        </div>
      </div>
      <footer className="mt-8 text-xs text-muted-foreground">
        {brand.name} by {brand.parentName}
      </footer>
    </main>
  )
}
