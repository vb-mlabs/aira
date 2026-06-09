import { apiServerFetch } from "@aira/api/server"
import { getAppSettingsOp } from "@/server/operations/app-settings-admin"
import { HomepageCmsForm } from "@/features/admin/components/homepage-cms-form"

export const metadata = { title: "Admin · Homepage Settings" }
export const dynamic = "force-dynamic"

export default async function HomepageSettingsPage() {
  const res = await apiServerFetch(getAppSettingsOp, { input: {} })
  const settings = res.data?.settings ?? []

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Homepage settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control the about section and stat display on the app home page.
        </p>
      </header>
      <HomepageCmsForm settings={settings} />
    </div>
  )
}
