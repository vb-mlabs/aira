// Admin-area layout. Wraps every /admin/* route — requireAdmin() returns
// 404 (via notFound()) for non-admin users so the existence of these
// routes isn't leaked. Locked decision in /plan-eng-review for W8.
//
// Shell composition mirrors the user-facing (app) layout so admins moving
// between /home and /admin feel one product:
//   - Desktop (md+): persistent green-textured sidebar fixed on the left
//     at 280px; main column has matching pl-[280px] and renders a thin
//     top utility bar above the page content.
//   - Mobile (< md): top bar (hamburger + "Admin" wordmark) + same
//     sidebar as a slide-in drawer. No bottom tab bar — admin tools are
//     desktop-first.

import Script from "next/script"
import Link from "next/link"
import { brand } from "@aira/config"
import { requireAdmin } from "@/lib/auth/server"
import { env } from "@/config/env"
import { AdminMobileSidebar } from "./_components/admin-mobile-sidebar"
import { AdminSidebar } from "./_components/admin-sidebar"
import { AdminTopBar } from "./_components/admin-top-bar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdmin()
  const adminRole = (admin as { role?: string }).role ?? "admin"

  return (
    <div className="min-h-full">
      {/* Desktop sidebar — fixed full-height on the left. */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-[280px] md:flex-col">
        <AdminSidebar userRole={adminRole} />
      </aside>

      <div className="flex min-h-full flex-col md:pl-[280px]">
        {/* Mobile top header. */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <AdminMobileSidebar userRole={adminRole} />
          <Link
            href="/admin"
            className="font-display text-lg font-semibold text-foreground"
          >
            {brand.name} <span className="text-muted-foreground">· Admin</span>
          </Link>
          <span className="size-9" aria-hidden />
        </header>

        {/* Desktop top utility bar. */}
        <AdminTopBar user={admin} />

        {/* Page content. */}
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <p className="sr-only">Signed in as admin {admin.email}</p>

      {env.GOOGLE_MAPS_API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${env.GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />
      )}
    </div>
  )
}
