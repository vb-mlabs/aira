// Category aggregates — the count-per-category map driving the /categories
// landing page tiles. "Categories" today are an enum of strings, not their
// own table; this module exists so the count contract has a single home and
// the route handler doesn't reach into the businesses module for a query
// that's logically about categories.

import { z } from "zod";
import { BusinessCategorySchema } from "./businesses";

export const CategoriesCountsInputSchema = z
  .object({
    withCounts: z.coerce.boolean().optional(),
  })
  .strict();
export type CategoriesCountsInput = z.infer<typeof CategoriesCountsInputSchema>;

/** Map of every BusinessCategory to its current visible count. Missing keys
 *  default to 0 in the service layer — clients never see a partial map. */
export const CategoriesCountsOutputSchema = z.object({
  counts: z.record(BusinessCategorySchema, z.number().int().min(0)),
});
export type CategoriesCountsOutput = z.infer<typeof CategoriesCountsOutputSchema>;
