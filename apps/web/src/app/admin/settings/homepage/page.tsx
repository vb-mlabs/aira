import { apiServerFetch } from "@aira/api/server"
import { getAppSettingsOp } from "@/server/operations/app-settings-admin"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { HomepageCmsForm } from "@/features/admin/components/homepage-cms-form"

export const metadata = { title: "Admin · Homepage Settings" }
export const dynamic = "force-dynamic"

export default async function HomepageSettingsPage() {
  const res = await apiServerFetch(getAppSettingsOp, { input: {} })
  const settings = res.data?.settings ?? []

  return (
    <AdminFormModal
      title="Homepage settings"
      description="Control the about section and stat display on the app home page."
      backHref="/admin"
    >
      <HomepageCmsForm settings={settings} />
    </AdminFormModal>
  )
}
