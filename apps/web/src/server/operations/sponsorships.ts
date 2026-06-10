import "server-only"

import { sponsorships as spService } from "@aira/services"
import {
  SponsorshipCreateInputSchema,
  SponsorshipUpdateInputSchema,
  SponsorshipListOutputSchema,
} from "@aira/validators/sponsorships"
import { z } from "zod"
import { ApiError } from "@aira/api"
import { createAudit } from "@aira/db/audit"
import { defineOperation } from "./index"

export const listSponsorshipsOp = defineOperation({
  name: "admin.sponsorships.list",
  // No .strict() — runFromRequest merges the URL [id] path param; stripping
  // unknown keys lets business_id from the query through cleanly.
  input: z.object({ business_id: z.string().min(1) }),
  output: SponsorshipListOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, { business_id }) => {
    const items = await spService.listSponsorshipsByBusiness(db, business_id)
    return { items }
  },
})

export const createSponsorshipOp = defineOperation({
  name: "admin.sponsorships.create",
  // .strip() — runFromRequest injects the URL [id] path param; strip mode
  // lets the body's business_id through without rejection.
  input: SponsorshipCreateInputSchema.strip(),
  output: z.object({ sponsorship: z.any() }),
  permission: "admin",
  handler: async (db, ctx, input) => {
    const audit = createAudit(db)
    await audit({
      actorId: ctx.userId,
      action: "business.sponsorship_assigned",
      target: { type: "business", id: input.business_id },
      meta: {
        kind: "business.sponsorship_assigned",
        category_id: input.category_id,
        tier_id: input.tier_id ?? "",
        end_date: input.end_date,
        amount_cents: input.amount_cents,
      },
    })
    const sponsorship = await spService.createSponsorship(db, input)
    return { sponsorship }
  },
})

export const updateSponsorshipOp = defineOperation({
  name: "admin.sponsorships.update",
  input: SponsorshipUpdateInputSchema,
  output: z.object({ sponsorship: z.any() }),
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const sponsorship = await spService.updateSponsorship(db, input)
    if (!sponsorship)
      throw ApiError.notFound("sponsorship.not_found", "Sponsorship not found")
    return { sponsorship }
  },
})

export const cancelSponsorshipOp = defineOperation({
  name: "admin.sponsorships.cancel",
  // Route: DELETE /businesses/[id]/sponsorships/[spId]
  // runFromRequest merges path params: id=businessId, spId=sponsorshipId.
  input: z.object({
    id: z.string().min(1),   // business ID from [id] path segment
    spId: z.string().min(1), // sponsorship ID from [spId] path segment
  }),
  output: z.object({ sponsorship: z.any() }),
  permission: "admin",
  handler: async (db, ctx, { id: businessId, spId }) => {
    const audit = createAudit(db)
    await audit({
      actorId: ctx.userId,
      action: "business.sponsorship_cancelled",
      target: { type: "business", id: businessId },
      meta: { kind: "business.sponsorship_cancelled" },
    })
    const sponsorship = await spService.cancelSponsorship(db, spId)
    if (!sponsorship)
      throw ApiError.notFound("sponsorship.not_found", "Sponsorship not found")
    return { sponsorship }
  },
})
