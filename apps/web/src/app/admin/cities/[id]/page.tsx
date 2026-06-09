import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { listCitiesAdminOp } from "@/server/operations/cities-admin"
import { CityForm } from "@/features/admin/components/city-form"

export const metadata = { title: "Admin · Edit City" }
export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCityPage({ params }: PageProps) {
  const { id } = await params
  const res = await apiServerFetch(listCitiesAdminOp, { input: {} })
  const city = res.data?.cities.find((c) => c.id === id)
  if (!city) notFound()

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Edit {city.name}</h1>
      </header>
      <CityForm city={city} />
    </div>
  )
}
