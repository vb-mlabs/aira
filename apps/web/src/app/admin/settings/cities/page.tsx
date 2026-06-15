import Link from "next/link"
import { Building2, Plus } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { listCitiesAdminOp } from "@/server/operations/cities-admin"
import { AdminBadge } from "@/features/admin"
import { EmptyState } from "@/lib/ui"
import { AdminPageHeader } from "../../_components/page-header"

export const metadata = { title: "Admin · Cities" }
export const dynamic = "force-dynamic"

export default async function AdminCitiesPage() {
  const res = await apiServerFetch(listCitiesAdminOp, { input: {} })
  const cities = res.data?.cities ?? []

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cities"
        subtitle="Manage the cities the directory covers."
        actions={
          <Link
            href="/admin/settings/cities/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden />
            New city
          </Link>
        }
      />

      {cities.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No cities yet"
          description="Add the first city to start building the directory."
          action={{ label: "New city", href: "/admin/settings/cities/new" }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Slug</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cities.map((city) => (
                <tr key={city.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/settings/cities/${city.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {city.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {city.slug}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge
                      variant={city.active ? "active" : "inactive"}
                      label={city.active ? "Active" : "Inactive"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
