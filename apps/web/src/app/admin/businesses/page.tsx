import Link from "next/link"
import { BadgeCheck } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { listBusinessesOp } from "@/server/operations/businesses"

export const metadata = { title: "Admin · Businesses" }
export const dynamic = "force-dynamic"

export default async function AdminBusinessesPage() {
  const res = await apiServerFetch(listBusinessesOp, { input: {} })
  const businesses = res.data?.items ?? []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and edit directory listings.
        </p>
      </header>

      {businesses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No businesses yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Tier</th>
                <th className="px-4 py-3 text-left font-semibold">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/businesses/${b.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.category}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{b.tier}</td>
                  <td className="px-4 py-3">
                    {b.verified && (
                      <BadgeCheck
                        className="size-4 fill-info text-info-foreground"
                        aria-label="Verified"
                      />
                    )}
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
