// Admin-area layout. Wraps every /admin/* route — requireAdmin() returns
// 404 (via notFound()) for non-admin users so the existence of these
// routes isn't leaked. Locked decision in /plan-eng-review for W8.

import Link from "next/link"
import { brand } from "@mlabs/config"
import { requireAdmin } from "@/lib/auth/server"
import { SignOutButton } from "../(app)/_components/sign-out-button"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdmin()

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              {brand.name}
            </Link>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/admin/users"
              className="text-muted-foreground hover:text-foreground"
            >
              Users
            </Link>
            <Link
              href="/admin/audit"
              className="text-muted-foreground hover:text-foreground"
            >
              Audit
            </Link>
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground"
            >
              Exit admin
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
      <p className="sr-only">Signed in as admin {admin.email}</p>
    </div>
  )
}
