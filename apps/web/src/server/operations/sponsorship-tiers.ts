import "server-only"

import { sponsorshipTiers as tiersService } from "@aira/services"
import {
  SponsorshipTierCreateInputSchema,
  SponsorshipTierUpdateInputSchema,
  SponsorshipTierListOutputSchema,
} from "@aira/validators/sponsorship-tiers"
import { z } from "zod"
import { ApiError } from "@aira/api"
import { defineOperation } from "./index"

const CITY_ID = "city-atlanta"

export const listSponsorshipTiersOp = defineOperation({
  name: "admin.sponsorship-tiers.list",
  input: z.object({ includeInactive: z.coerce.boolean().optional() }).strict(),
  output: SponsorshipTierListOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, { includeInactive }) => {
    const items = await tiersService.listSponsorshipTiers(db, CITY_ID, includeInactive ?? false)
    return { items }
  },
})

export const createSponsorshipTierOp = defineOperation({
  name: "admin.sponsorship-tiers.create",
  input: SponsorshipTierCreateInputSchema.omit({ city_id: true }),
  output: z.object({ tier: z.any() }),
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const tier = await tiersService.createSponsorshipTier(db, { ...input, city_id: CITY_ID })
    return { tier }
  },
})

export const updateSponsorshipTierOp = defineOperation({
  name: "admin.sponsorship-tiers.update",
  input: SponsorshipTierUpdateInputSchema,
  output: z.object({ tier: z.any() }),
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const tier = await tiersService.updateSponsorshipTier(db, input)
    if (!tier) throw ApiError.notFound("sponsorship_tier.not_found", "Tier not found")
    return { tier }
  },
})

export const deactivateSponsorshipTierOp = defineOperation({
  name: "admin.sponsorship-tiers.deactivate",
  input: z.object({ id: z.string().min(1) }).strict(),
  output: z.object({ tier: z.any() }),
  permission: "admin",
  handler: async (db, _ctx, { id }) => {
    const tier = await tiersService.deactivateSponsorshipTier(db, id)
    if (!tier) throw ApiError.notFound("sponsorship_tier.not_found", "Tier not found")
    return { tier }
  },
})
