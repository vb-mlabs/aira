import { triggerCronRunOp } from "@/server/operations/cron-admin"
export const runtime = "nodejs"
export const POST = triggerCronRunOp.runFromRequest
