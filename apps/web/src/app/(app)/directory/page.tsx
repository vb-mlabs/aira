import type { Metadata } from "next"
import { apiServerFetch } from "@aira/api/server"
import { getSession } from "@/lib/auth/server"
import { listBusinessesOp } from "@/server/operations/businesses"
import { listCategoriesOp } from "@/server/operations/categories"
import { listMyFavoriteIdsOp } from "@/server/operations/favorites"
import { DirectoryView } from "@/features/listings/components/directory-view"

export const metadata: Metadata = {
  title: "All Businesses",
}

const PAGE_SIZE = 12

export default async function DirectoryPage() {
  const session = await getSession()
  const isSignedIn = !!session

  const [res, categoriesRes, favIdsRes] = await Promise.all([
    apiServerFetch(listBusinessesOp, {
      input: { page: 1, pageSize: PAGE_SIZE },
    }),
    apiServerFetch(listCategoriesOp, { input: {} }),
    isSignedIn
      ? apiServerFetch(listMyFavoriteIdsOp, { input: {} })
      : Promise.resolve(null),
  ])

  const items = res.data?.items ?? []
  const total = res.data?.total ?? 0
  const categories = categoriesRes.data?.categories ?? []
  const favIds = favIdsRes?.data?.ids ?? []

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <DirectoryView
        initialItems={items}
        total={total}
        pageSize={PAGE_SIZE}
        categories={categories}
        isSignedIn={isSignedIn}
        favIds={favIds}
      />
    </div>
  )
}
