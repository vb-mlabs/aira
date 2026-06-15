import Link from "next/link"
import { Plus } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { listCategoriesAdminOp } from "@/server/operations/categories-admin"
import { CategoryTreeManager } from "@/features/admin/components/category-tree-manager"

export const metadata = { title: "Admin · Categories" }
export const dynamic = "force-dynamic"

export default async function AdminCategoriesPage() {
  const res = await apiServerFetch(listCategoriesAdminOp, { input: {} })
  const tree = res.data?.tree ?? []

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag to reorder. Click edit to change name or slug.
          </p>
        </div>
        <Link
          href="/admin/settings/categories/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" aria-hidden />
          New category
        </Link>
      </header>

      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <CategoryTreeManager tree={tree} />
      )}
    </div>
  )
}
