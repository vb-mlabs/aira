// Auth shell — wraps /login, /signup, /forgot-password, /reset-password,
// /verify-email. Renders the tree-of-life logo header above the card and the
// "AIRA by Nisarga" attribution footer below it.
//
// Background is the cream paper PNG (same asset used on the landing page's
// cream sections) so auth visually matches the marketing surface. It paints
// on <main>, layered over the body's --texture-paper fallback.

import Image from "next/image"
import Link from "next/link"
import { brand } from "@aira/config"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-[url('/marketing-images/textures/paper-cream.webp')] bg-cover bg-center px-6 py-12">
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
        <div className="w-full">
          {children}
        </div>
      </div>
      <footer className="mt-8 text-xs text-muted-foreground">
        {brand.name} by {brand.parentName}
      </footer>
    </main>
  )
}
