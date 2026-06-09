import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { CityForm } from "@/features/admin/components/city-form"

export const metadata = { title: "Admin · New City" }

export default function NewCityPage() {
  return (
    <AdminFormModal title="New city" backHref="/admin/cities">
      <CityForm />
    </AdminFormModal>
  )
}
