import { apiServerFetch } from "@aira/api/server"
import { listCitiesAdminOp } from "@/server/operations/cities-admin"
import { listCategoriesOp } from "@/server/operations/categories"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { BusinessCreateForm } from "@/features/admin/components/business-create-form"

export const metadata = { title: "Admin · New Business" }

export default async function NewBusinessPage() {
  const [citiesRes, categoriesRes] = await Promise.all([
    apiServerFetch(listCitiesAdminOp, { input: {} }),
    apiServerFetch(listCategoriesOp, { input: {} }),
  ])
  const cities = citiesRes.data?.cities ?? []
  const categories = categoriesRes.data?.categories ?? []

  return (
    <AdminFormModal title="New business" backHref="/admin/businesses">
      <BusinessCreateForm cities={cities} categories={categories} />
    </AdminFormModal>
  )
}
