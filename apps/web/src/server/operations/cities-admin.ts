import "server-only"

// Super_admin-permission operations for the cities domain. Cities are
// platform-shape config (taxonomy that listings live under), so only
// super_admin can mutate.

import { cities as citiesService } from "@aira/services"
import {
  CityCreateInputSchema,
  CityUpdateInputSchema,
  CityListOutputSchema,
} from "@aira/validators/cities"
import { ApiError } from "@aira/api"
import { z } from "zod"
import { defineOperation } from "./index"

export const listCitiesAdminOp = defineOperation({
  name: "admin.cities.list",
  input: z.object({}).strict(),
  output: CityListOutputSchema,
  permission: "super_admin",
  handler: async (db) => {
    const cities = await citiesService.listCities(db)
    return { cities }
  },
})

/** Plain-admin-readable cities list — same payload as the
 *  super-admin variant, but accessible to "admin" perms so the F21
 *  broadcast modal's by_city picker has a list of options. Cities
 *  are platform-shape config; reads are safe for any admin, mutations
 *  stay super_admin via the create/update ops above. */
export const listCitiesForAdminOp = defineOperation({
  name: "admin.cities.listForAdmin",
  input: z.object({}).strict(),
  output: CityListOutputSchema,
  permission: "admin",
  handler: async (db) => {
    const cities = await citiesService.listCities(db)
    return { cities }
  },
})

export const createCityOp = defineOperation({
  name: "admin.cities.create",
  input: CityCreateInputSchema,
  output: z.object({ city: z.any() }),
  permission: "super_admin",
  handler: async (db, _ctx, input) => {
    const city = await citiesService.createCity(db, input)
    return { city }
  },
})

export const updateCityOp = defineOperation({
  name: "admin.cities.update",
  input: CityUpdateInputSchema,
  output: z.object({ city: z.any() }),
  permission: "super_admin",
  handler: async (db, _ctx, { id, ...data }) => {
    const city = await citiesService.updateCity(db, id, data)
    if (!city) throw ApiError.notFound("cities.not_found", "City not found")
    return { city }
  },
})
