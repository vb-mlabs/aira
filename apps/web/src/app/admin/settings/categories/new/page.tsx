import { apiServerFetch } from "@aira/api/server"
import { listCategoriesAdminOp } from "@/server/operations/categories-admin"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { CategoryForm } from "@/features/admin/components/category-form"

export const metadata = { title: "Admin · New Category" }
export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ parent?: string }>
}

export default async function NewCategoryPage({ searchParams }: PageProps) {
  const [sp, res] = await Promise.all([searchParams, apiServerFetch(listCategoriesAdminOp, { input: {} })])
  const roots = res.data?.tree.map((n) => n.root) ?? []

  // ?parent=<rootId> preselects the parent field so admins linked from
  // the Add-subcategory affordance in the business admin land ready to
  // type a name. Silently drop the param if it doesn't resolve to a
  // known root id (URL tampering / stale link).
  const defaultParentId =
    sp.parent && roots.some((r) => r.id === sp.parent) ? sp.parent : undefined

  return (
    <AdminFormModal title="New category" backHref="/admin/settings/categories">
      <CategoryForm roots={roots} defaultParentId={defaultParentId} />
    </AdminFormModal>
  )
}
