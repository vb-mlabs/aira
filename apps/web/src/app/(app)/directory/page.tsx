import type { Metadata } from "next"
import { apiServerFetch } from "@aira/api/server"
import { listBusinessesOp } from "@/server/operations/businesses"
import { listCategoriesOp } from "@/server/operations/categories"
import { DirectoryView } from "@/features/listings/components/directory-view"

export const metadata: Metadata = {
  title: "All Businesses",
}

const PAGE_SIZE = 12

export default async function DirectoryPage() {
  const [res, categoriesRes] = await Promise.all([
    apiServerFetch(listBusinessesOp, {
      input: { page: 1, pageSize: PAGE_SIZE },
    }),
    apiServerFetch(listCategoriesOp, { input: {} }),
  ])

  const items = res.data?.items ?? []
  const total = res.data?.total ?? 0
  const categories = categoriesRes.data?.categories ?? []

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <DirectoryView
        initialItems={items}
        total={total}
        pageSize={PAGE_SIZE}
        categories={categories}
      />
    </div>
  )
}
