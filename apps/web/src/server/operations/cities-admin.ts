import "server-only"

// Admin-permission operations for the cities domain.

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
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const city = await citiesService.createCity(db, input)
    return { city }
  },
})

export const updateCityOp = defineOperation({
  name: "admin.cities.update",
  input: CityUpdateInputSchema,
  output: z.object({ city: z.any() }),
  permission: "admin",
  handler: async (db, _ctx, { id, ...data }) => {
    const city = await citiesService.updateCity(db, id, data)
    if (!city) throw ApiError.notFound("cities.not_found", "City not found")
    return { city }
  },
})
