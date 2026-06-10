import { apiServerFetch } from "@aira/api/server"
import { listCitiesAdminOp } from "@/server/operations/cities-admin"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { BusinessCreateForm } from "@/features/admin/components/business-create-form"

export const metadata = { title: "Admin · New Business" }

export default async function NewBusinessPage() {
  const res = await apiServerFetch(listCitiesAdminOp, { input: {} })
  const cities = res.data?.cities ?? []

  return (
    <AdminFormModal title="New business" backHref="/admin/businesses">
      <BusinessCreateForm cities={cities} />
    </AdminFormModal>
  )
}
