import { updateSponsorshipTierOp, deactivateSponsorshipTierOp } from "@/server/operations/sponsorship-tiers"
export const runtime = "nodejs"
export const PATCH = updateSponsorshipTierOp.runFromRequest
export const DELETE = deactivateSponsorshipTierOp.runFromRequest
