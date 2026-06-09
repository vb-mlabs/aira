import { apiServerFetch } from "@aira/api/server"
import { listCategoriesAdminOp } from "@/server/operations/categories-admin"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { CategoryForm } from "@/features/admin/components/category-form"

export const metadata = { title: "Admin · New Category" }
export const dynamic = "force-dynamic"

export default async function NewCategoryPage() {
  const res = await apiServerFetch(listCategoriesAdminOp, { input: {} })
  const roots = res.data?.tree.map((n) => n.root) ?? []

  return (
    <AdminFormModal title="New category" backHref="/admin/categories">
      <CategoryForm roots={roots} />
    </AdminFormModal>
  )
}
