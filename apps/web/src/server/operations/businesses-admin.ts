import "server-only"

import { businesses as businessesService } from "@aira/services"
import {
  BusinessUpdateInputSchema,
  BusinessUpdateOutputSchema,
} from "@aira/validators/businesses"
import { ApiError } from "@aira/api"
import { defineOperation } from "./index"

export const updateBusinessOp = defineOperation({
  name: "admin.businesses.update",
  input: BusinessUpdateInputSchema,
  output: BusinessUpdateOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, { id, ...data }) => {
    const business = await businessesService.updateBusiness(db, id, data)
    if (!business) throw ApiError.notFound("businesses.not_found", "Business not found")
    return { business }
  },
})
