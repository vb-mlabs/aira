import { apiServerFetch } from "@aira/api/server"
import { getReminderScheduleOp } from "@/server/operations/app-settings-admin"
import { AdminPageHeader } from "../../_components/page-header"
import { RenewalScheduleForm } from "@/features/admin/components/renewal-schedule-form"

export const metadata = { title: "Admin · Renewal schedule" }
export const dynamic = "force-dynamic"

export default async function RenewalSchedulePage() {
  const res = await apiServerFetch(getReminderScheduleOp, { input: {} })
  const value = res.data?.value ?? "7"
  const windows = res.data?.windows ?? [7]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Renewal schedule"
        subtitle="Days before renewal that we send the admin a digest of expiring business subscriptions."
      />
      <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <RenewalScheduleForm initialValue={value} initialWindows={windows} />
      </div>
    </div>
  )
}
