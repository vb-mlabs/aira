import { z } from "zod";

export const BusinessImageSchema = z.object({
  id: z.string(),
  business_id: z.string(),
  url: z.string(),
  sort_order: z.number().int(),
  created_at: z.string(),
});
export type BusinessImage = z.infer<typeof BusinessImageSchema>;
