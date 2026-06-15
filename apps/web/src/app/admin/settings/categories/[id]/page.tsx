import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { listCategoriesAdminOp } from "@/server/operations/categories-admin"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { CategoryForm } from "@/features/admin/components/category-form"

export const metadata = { title: "Admin · Edit Category" }
export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params
  const res = await apiServerFetch(listCategoriesAdminOp, { input: {} })
  const tree = res.data?.tree ?? []

  const allCategories = tree.flatMap((n) => [n.root, ...n.children])
  const category = allCategories.find((c) => c.id === id)
  if (!category) notFound()

  const roots = tree.map((n) => n.root)

  return (
    <AdminFormModal title={`Edit ${category.name}`} backHref="/admin/settings/categories">
      <CategoryForm category={category} roots={roots} />
    </AdminFormModal>
  )
}
