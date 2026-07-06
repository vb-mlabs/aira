import { apiServerFetch } from "@aira/api/server"
import { listCitiesAdminOp } from "@/server/operations/cities-admin"
import { listCategoriesTreeOp } from "@/server/operations/categories"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { BusinessCreateForm } from "@/features/admin/components/business-create-form"

export const metadata = { title: "Admin · New Business" }

export default async function NewBusinessPage() {
  const [citiesRes, treeRes] = await Promise.all([
    apiServerFetch(listCitiesAdminOp, { input: {} }),
    apiServerFetch(listCategoriesTreeOp, { input: {} }),
  ])
  const cities = citiesRes.data?.cities ?? []
  const tree = treeRes.data?.tree ?? []

  // Filter to active branches only — inactive roots drop their whole
  // subtree; individually-inactive children get dropped alone. Mirrors
  // the pattern used by /admin/businesses/[id] for the edit modal.
  const categoryTree = tree
    .filter(({ root }) => root.active)
    .map(({ root, children }) => ({
      root,
      children: children.filter((c) => c.active),
    }))

  return (
    <AdminFormModal title="New business" backHref="/admin/businesses">
      <BusinessCreateForm cities={cities} categoryTree={categoryTree} />
    </AdminFormModal>
  )
}
