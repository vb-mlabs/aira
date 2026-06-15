// Settings hub layout. Gates the whole subtree on super_admin and renders
// the tab strip above the active route. Plain admins get notFound() — same
// idiom as the audit/cron pages and consistent with the W8 decision to
// avoid 403/404 differentiation on /admin/*.

import { requireSuperAdmin } from "@/lib/auth/server"
import { SettingsTabs } from "../_components/settings-tabs"

export default async function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSuperAdmin()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-shape configuration — taxonomy, pricing, and app-level
          settings. Locked to super-admins.
        </p>
      </header>
      <SettingsTabs />
      <div className="pt-2">{children}</div>
    </div>
  )
}
