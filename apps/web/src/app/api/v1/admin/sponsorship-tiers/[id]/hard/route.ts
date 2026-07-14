import { deleteSponsorshipTierOp } from "@/server/operations/sponsorship-tiers"
export const runtime = "nodejs"
export const DELETE = deleteSponsorshipTierOp.runFromRequest
