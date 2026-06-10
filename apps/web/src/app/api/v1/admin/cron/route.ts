import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { getSessionFromHeaders, adminSessionIsStale } from "@/lib/auth/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const session = await getSessionFromHeaders(req.headers)
  if (!session?.user) return ApiError.unauthorized().toResponse()
  const role = (session.user as { role?: string }).role ?? "end_user"
  if (role !== "admin" && role !== "super_admin") {
    return ApiError.forbidden("Admin access required").toResponse()
  }
  const sessionId = (session.session as { id?: string }).id
  if (await adminSessionIsStale(sessionId)) return ApiError.idleTimeout().toResponse()

  const { getRegisteredJobs } = await import("@/lib/cron/registry")
  return NextResponse.json({ jobs: getRegisteredJobs() })
}
