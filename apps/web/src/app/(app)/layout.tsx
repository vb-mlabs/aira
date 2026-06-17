// Authed-area layout. Wraps all (app)/* routes — anything that requires
// a signed-in user. Unauthenticated requests redirect to /login via
// requireUser.
//
// Shell composition (locked by the V4 mockup approved 2026-05-27):
//   - Desktop (md+): persistent green-textured sidebar fixed on the left
//     at 280px; main column has matching pl-[280px] and renders a thin
//     top utility bar above the page content.
//   - Mobile (< md): top bar (hamburger + AIRA wordmark + bell) + the
//     same sidebar accessible as a slide-in drawer; 3-tab bottom bar
//     (Home/Categories/Account) fixed to the viewport bottom.

import Link from "next/link"
import { brand } from "@aira/config"
import { apiServerFetch } from "@aira/api/server"
import { requireUser } from "@/lib/auth/server"
import { listCategoriesTreeOp } from "@/server/operations/categories"
import { NotificationBell } from "@/features/notifications"
import { AppSidebar } from "./_components/app-sidebar"
import { BottomTabBar } from "./_components/bottom-tab-bar"
import { MobileSidebar } from "./_components/mobile-sidebar"
import { TopUtilityBar } from "./_components/top-utility-bar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, categoriesRes] = await Promise.all([
    requireUser(),
    // Tree variant so the sidebar can render subcategories under their
    // parent. listCategoriesTreeOp returns roots + children together;
    // the prior listCategoriesOp returned roots only, which hid
    // subcategories from end-users entirely.
    apiServerFetch(listCategoriesTreeOp, { input: {} }),
  ])
  const categoryTree = categoriesRes.data?.tree ?? []
  const role = (user as { role?: string }).role ?? "end_user"
  const isAdmin = role === "admin" || role === "super_admin"

  return (
    <div className="min-h-full">
      {/* Desktop sidebar — fixed full-height on the left. */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-[280px] md:flex-col md:overflow-hidden">
        <AppSidebar tree={categoryTree} isAdmin={isAdmin} />
      </aside>

      <div className="flex min-h-full flex-col md:pl-[280px]">
        {/* Mobile top header. */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <MobileSidebar tree={categoryTree} isAdmin={isAdmin} />
          <Link
            href="/home"
            className="font-display text-lg font-semibold text-foreground"
          >
            {brand.name}
          </Link>
          <NotificationBell />
        </header>

        {/* Desktop top utility bar (Notifications / Account avatar). */}
        <TopUtilityBar user={user} />

        {/* Page content. Bottom padding clears the mobile tab bar; the
            sidebar already pushes width on desktop via md:pl-[280px]. */}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      <BottomTabBar />

      <p className="sr-only">Signed in as {user.email}</p>
    </div>
  )
}
