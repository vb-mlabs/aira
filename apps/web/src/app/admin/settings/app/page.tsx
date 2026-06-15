import { apiServerFetch } from "@aira/api/server"
import {
  getAppSettingsOp,
  getReminderScheduleOp,
} from "@/server/operations/app-settings-admin"
import { HomepageCmsForm } from "@/features/admin/components/homepage-cms-form"
import { RenewalScheduleForm } from "@/features/admin/components/renewal-schedule-form"

export const metadata = { title: "Admin · App settings" }
export const dynamic = "force-dynamic"

// App-level settings tab — bundles every small admin-controlled knob that
// isn't a taxonomy onto one page. Forks that add more app-level settings
// drop new <section>s in here.
//
// Two sections today: homepage CMS strings and the renewal-reminder cron
// windows. Both forms are self-contained client components that PATCH
// /api/v1/admin/app-settings/* directly — no shared state, so co-rendering
// is safe.

export default async function AdminAppSettingsPage() {
  const [settingsRes, scheduleRes] = await Promise.all([
    apiServerFetch(getAppSettingsOp, { input: {} }),
    apiServerFetch(getReminderScheduleOp, { input: {} }),
  ])
  const settings = settingsRes.data?.settings ?? []
  const scheduleValue = scheduleRes.data?.value ?? "7"
  const scheduleWindows = scheduleRes.data?.windows ?? [7]

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <header>
          <h2 className="font-display text-xl text-foreground">Homepage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            About title + body and the businesses / community count overrides
            on /home.
          </p>
        </header>
        <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <HomepageCmsForm settings={settings} />
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="font-display text-xl text-foreground">
            Renewal schedule
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Days before renewal that the cron emails the admin a digest of
            expiring business subscriptions.
          </p>
        </header>
        <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <RenewalScheduleForm
            initialValue={scheduleValue}
            initialWindows={scheduleWindows}
          />
        </div>
      </section>
    </div>
  )
}
