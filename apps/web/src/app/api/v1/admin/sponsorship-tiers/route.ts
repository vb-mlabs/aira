import { listSponsorshipTiersOp, createSponsorshipTierOp } from "@/server/operations/sponsorship-tiers"
export const runtime = "nodejs"
export const GET = listSponsorshipTiersOp.runFromRequest
export const POST = createSponsorshipTierOp.runFromRequest
