// /listings/[category]/[id] — single business detail. The [category]
// segment is informational (used by the BusinessDetail back link); the
// id alone is enough to resolve the row. Mismatched category → still
// renders, BusinessDetail's back chevron just points at the user-clicked
// category instead of the canonical one. Cheap, harmless.

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BusinessDetail } from "@/features/listings"
import { apiServerFetch } from "@aira/api/server"
import { getSession } from "@/lib/auth/server"
import { getBusinessByIdOp } from "@/server/operations/businesses"
import { listMyFavoriteIdsOp } from "@/server/operations/favorites"

interface PageProps {
  params: Promise<{ category: string; id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const res = await apiServerFetch(getBusinessByIdOp, {
    input: { id },
    pathParams: { id },
  })
  const business = res.data?.business ?? null
  return { title: business?.name ?? "Not found" }
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await getSession()
  const isSignedIn = !!session

  const [res, favIdsRes] = await Promise.all([
    apiServerFetch(getBusinessByIdOp, {
      input: { id },
      pathParams: { id },
    }),
    isSignedIn
      ? apiServerFetch(listMyFavoriteIdsOp, { input: {} })
      : Promise.resolve(null),
  ])
  const business = res.data?.business ?? null
  if (!business) notFound()

  const favIds = new Set(favIdsRes?.data?.ids ?? [])

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <BusinessDetail
        business={business}
        isSignedIn={isSignedIn}
        isFavorited={favIds.has(business.id)}
      />
    </div>
  )
}
