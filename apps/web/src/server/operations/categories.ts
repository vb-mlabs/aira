import "server-only"

// Categories operations. Today there's just one: the count-per-category
// aggregate driving the /categories page tiles.

import { categories as categoriesService } from "@aira/services"
import {
  CategoriesCountsInputSchema,
  CategoriesCountsOutputSchema,
} from "@aira/validators/categories"
import { defineOperation } from "./index"

export const listCategoriesWithCountsOp = defineOperation({
  name: "categories.listWithCounts",
  input: CategoriesCountsInputSchema,
  output: CategoriesCountsOutputSchema,
  permission: "user",
  handler: async (db) => {
    const counts = await categoriesService.getBusinessCountsByCategory(db)
    return { counts }
  },
})
