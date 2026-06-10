import { listSponsorshipsOp, createSponsorshipOp } from "@/server/operations/sponsorships"
export const runtime = "nodejs"
export const GET = listSponsorshipsOp.runFromRequest
export const POST = createSponsorshipOp.runFromRequest
