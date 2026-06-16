import { apiServerFetch } from "@aira/api/server"
import { getReminderScheduleOp } from "@/server/operations/app-settings-admin"
import { RenewalScheduleForm } from "@/features/admin/components/renewal-schedule-form"

export const metadata = { title: "Admin · Renewals" }
export const dynamic = "force-dynamic"

// Renewals tab — the only runtime-editable knob in the Settings hub right
// now. Other knobs that used to share this page (the homepage CMS strings)
// moved to the brand layer (packages/config/src/brand.ts:brand.homepage)
// since they only change at fork time.

export default async function AdminRenewalsPage() {
  const scheduleRes = await apiServerFetch(getReminderScheduleOp, {
    input: {},
  })
  const scheduleValue = scheduleRes.data?.value ?? "7"
  const scheduleWindows = scheduleRes.data?.windows ?? [7]

  return (
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
  )
}
