import { updateSponsorshipOp, cancelSponsorshipOp } from "@/server/operations/sponsorships"
export const runtime = "nodejs"
export const PATCH = updateSponsorshipOp.runFromRequest
export const DELETE = cancelSponsorshipOp.runFromRequest
