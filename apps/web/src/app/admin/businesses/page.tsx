import Link from "next/link"
import { BadgeCheck } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { listAllBusinessesAdminOp } from "@/server/operations/businesses-admin"
import { cn } from "@aira/ui-web/utils"

export const metadata = { title: "Admin · Businesses" }
export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ archived?: string }>
}

export default async function AdminBusinessesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const includeArchived = sp.archived === "1"
  const res = await apiServerFetch(listAllBusinessesAdminOp, {
    input: { includeArchived: includeArchived || undefined },
  })
  const businesses = res.data?.items ?? []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and edit directory listings.
        </p>
      </header>

      <div className="flex items-center gap-3">
        <Link
          href="/admin/businesses"
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            !includeArchived
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-primary/60",
          )}
        >
          Active only
        </Link>
        <Link
          href="/admin/businesses?archived=1"
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            includeArchived
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-primary/60",
          )}
        >
          Show archived
        </Link>
      </div>

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
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {businesses.map((b) => {
                const archived = b.deleted_at !== null
                return (
                  <tr
                    key={b.id}
                    className={cn("hover:bg-muted/20", archived && "opacity-70")}
                  >
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
                    <td className="px-4 py-3">
                      <StatusChip archived={archived} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusChip({ archived }: { archived: boolean }) {
  if (archived) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Archived
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
      Active
    </span>
  )
}
