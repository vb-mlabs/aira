import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { requireAdminJSON } from "@/lib/auth/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const auth = await requireAdminJSON(req)
  if (auth instanceof Response) return auth

  const { getRegisteredJobs } = await import("@/lib/cron/registry")
  return NextResponse.json({ jobs: getRegisteredJobs() })
}
