import { apiServerFetch } from "@aira/api/server"
import { listCitiesForAdminOp } from "@/server/operations/cities-admin"
import { listCategoriesTreeOp } from "@/server/operations/categories"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { BusinessCreateForm } from "@/features/admin/components/business-create-form"

export const metadata = { title: "Admin · New Business" }

export default async function NewBusinessPage() {
  const [citiesRes, treeRes] = await Promise.all([
    apiServerFetch(listCitiesForAdminOp, { input: {} }),
    apiServerFetch(listCategoriesTreeOp, { input: {} }),
  ])
  // Filter inactive cities out of the picker — inactive rows are
  // retained in the DB for existing listings' historical FK but should
  // not be selectable for a new business. Same pattern as the category
  // tree below.
  const cities = (citiesRes.data?.cities ?? []).filter((c) => c.active)
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
