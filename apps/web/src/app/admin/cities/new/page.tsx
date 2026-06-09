import { CityForm } from "@/features/admin/components/city-form"

export const metadata = { title: "Admin · New City" }

export default function NewCityPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New city</h1>
      </header>
      <CityForm />
    </div>
  )
}
