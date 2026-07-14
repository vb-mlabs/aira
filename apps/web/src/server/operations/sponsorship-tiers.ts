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
  input: z.object({
    includeInactive: z.coerce.boolean().optional(),
  }),
  output: SponsorshipTierListOutputSchema,
  // LIST is read-only and admins need it to attach a sponsorship to a
  // business via the Sponsorships card on /admin/businesses/[id]. The
  // create/update/deactivate ops below manage the tier catalog itself
  // and correctly stay super_admin.
  permission: "admin",
  handler: async (db, _ctx, { includeInactive }) => {
    const tiers = await tiersService.listSponsorshipTiers(db, CITY_ID, includeInactive ?? false)
    return { items: tiers }
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

// Hard-delete. Refuses when sponsorships reference the tier (via the
// service-level SponsorshipTierHasSponsorshipsError guard). The UI
// hides the Delete button when sponsorship_count > 0, but the guard
// here is the source of truth for the race case.
export const deleteSponsorshipTierOp = defineOperation({
  name: "admin.sponsorship-tiers.delete",
  input: z.object({ id: z.string().min(1) }).strict(),
  output: z.object({ tier: z.any() }),
  permission: "super_admin",
  handler: async (db, _ctx, { id }) => {
    try {
      const tier = await tiersService.deleteSponsorshipTier(db, id)
      if (!tier) throw ApiError.notFound("sponsorship_tier.not_found", "Tier not found")
      return { tier }
    } catch (err) {
      if (err instanceof tiersService.SponsorshipTierHasSponsorshipsError) {
        throw ApiError.badRequest("sponsorship_tier.has_sponsorships", err.message)
      }
      throw err
    }
  },
})
