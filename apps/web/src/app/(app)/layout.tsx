// Authed-area layout. Wraps all (app)/* routes — anything that requires a
// signed-in user. Unauthenticated requests redirect to /login via requireUser.
//
// Keep the shell deliberately thin: header with brand + sign out, full-width
// content. Features mount inside without competing for chrome.

import Link from "next/link"
import { brand } from "@mlabs/config"
import { requireUser } from "@/lib/auth/server"
import { NotificationBell } from "@/features/notifications"
import { SignOutButton } from "./_components/sign-out-button"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            {brand.name}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <NotificationBell />
            <Link
              href="/messages"
              className="text-muted-foreground hover:text-foreground"
            >
              Messages
            </Link>
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground"
            >
              Profile
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {children}
      </main>
      <p className="sr-only">Signed in as {user.email}</p>
    </div>
  )
}
