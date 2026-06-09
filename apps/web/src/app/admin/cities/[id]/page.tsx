import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { listCitiesAdminOp } from "@/server/operations/cities-admin"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
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
    <AdminFormModal title={`Edit ${city.name}`} backHref="/admin/cities">
      <CityForm city={city} />
    </AdminFormModal>
  )
}
