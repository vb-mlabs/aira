import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { listCategoriesAdminOp } from "@/server/operations/categories-admin"
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
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit {category.name}
        </h1>
      </header>
      <CategoryForm category={category} roots={roots} />
    </div>
  )
}
