// Centered-card layout for /login, /signup, /forgot-password, /reset-password,
// /verify-email per design decision D2. Polished in Task 6 to
// carry the MLabs orange-dot wordmark + a soft top glow that re-uses the
// landing page hero treatment.

import Link from "next/link"
import { brand } from "@mlabs/config"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, color-mix(in oklch, var(--color-primary) 8%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md space-y-8">
        <Link href="/" className="flex items-center justify-center gap-2">
          <span className="inline-block size-2.5 rounded-full bg-primary" />
          <span className="text-lg font-extrabold tracking-tight">
            {brand.name}
          </span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.18)]">
          {children}
        </div>
      </div>
    </main>
  )
}
