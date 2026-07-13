import "server-only"

import { sponsorshipTiers as tiersService, sponsorships as sponsorshipsService } from "@aira/services"
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
  input: z.object({
    includeInactive: z.coerce.boolean().optional(),
    category_id: z.string().optional(),
  }),
  output: SponsorshipTierListOutputSchema,
  // LIST is read-only and admins need it to attach a sponsorship to a
  // business via the Sponsorships card on /admin/businesses/[id]. The
  // create/update/deactivate ops below manage the tier catalog itself
  // and correctly stay super_admin.
  permission: "admin",
  handler: async (db, _ctx, { includeInactive, category_id }) => {
    const tiers = await tiersService.listSponsorshipTiers(db, CITY_ID, includeInactive ?? false)
    if (!category_id) return { items: tiers }

    // Annotate each tier with slot usage for the given category
    const items = await Promise.all(
      tiers.map(async (tier) => {
        if (tier.max_slots == null) return tier
        const slots_used = await sponsorshipsService.countActiveSponsorships(db, tier.id, category_id)
        return { ...tier, slots_used }
      }),
    )
    return { items }
  },
})

export const createSponsorshipTierOp = defineOperation({
  name: "admin.sponsorship-tiers.create",
  input: SponsorshipTierCreateInputSchema.omit({ city_id: true }),
  output: z.object({ tier: z.any() }),
  permission: "super_admin",
  handler: async (db, _ctx, input) => {
    const tier = await tiersService.createSponsorshipTier(db, { ...input, city_id: CITY_ID })
    return { tier }
  },
})

export const updateSponsorshipTierOp = defineOperation({
  name: "admin.sponsorship-tiers.update",
  input: SponsorshipTierUpdateInputSchema,
  output: z.object({ tier: z.any() }),
  permission: "super_admin",
  handler: async (db, _ctx, input) => {
    const tier = await tiersService.updateSponsorshipTier(db, input)
    if (!tier) throw ApiError.notFound("sponsorship_tier.not_found", "Tier not found")
    return { tier }
  },
})

export const deactivateSponsorshipTierOp = defineOperation({
  name: "admin.sponsorship-tiers.deactivate",
  input: z.object({ id: z.string().min(1) }),
  output: z.object({ tier: z.any() }),
  permission: "super_admin",
  handler: async (db, _ctx, { id }) => {
    const tier = await tiersService.deactivateSponsorshipTier(db, id)
    if (!tier) throw ApiError.notFound("sponsorship_tier.not_found", "Tier not found")
    return { tier }
  },
})
