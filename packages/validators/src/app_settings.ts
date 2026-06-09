import { z } from "zod";

export const AppSettingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  updated_at: z.string(),
});
export type AppSetting = z.infer<typeof AppSettingSchema>;

export const AppSettingUpdateInputSchema = z
  .object({
    key: z.string().min(1),
    value: z.string(),
  })
  .strict();
export type AppSettingUpdateInput = z.infer<typeof AppSettingUpdateInputSchema>;

export const AppSettingsOutputSchema = z.object({
  settings: z.array(AppSettingSchema),
});
export type AppSettingsOutput = z.infer<typeof AppSettingsOutputSchema>;
