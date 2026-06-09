import Link from "next/link"
import { Plus } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { listCitiesAdminOp } from "@/server/operations/cities-admin"
import { cn } from "@aira/ui-web/utils"

export const metadata = { title: "Admin · Cities" }
export const dynamic = "force-dynamic"

export default async function AdminCitiesPage() {
  const res = await apiServerFetch(listCitiesAdminOp, { input: {} })
  const cities = res.data?.cities ?? []

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the cities the directory covers.
          </p>
        </div>
        <Link
          href="/admin/cities/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" aria-hidden />
          New city
        </Link>
      </header>

      {cities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No cities yet.</p>
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
                      href={`/admin/cities/${city.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {city.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{city.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        city.active
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {city.active ? "Active" : "Inactive"}
                    </span>
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
