import { eq } from "drizzle-orm";
import { app_settings } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import type { AppSetting } from "@aira/validators/app_settings";

export async function getAppSettings(db: Database): Promise<AppSetting[]> {
  const rows = await db.select().from(app_settings).orderBy(app_settings.key);
  return rows.map(toAppSetting);
}

export async function getAppSetting(
  db: Database,
  key: string,
): Promise<AppSetting | null> {
  const [row] = await db
    .select()
    .from(app_settings)
    .where(eq(app_settings.key, key))
    .limit(1);
  return row ? toAppSetting(row) : null;
}

export async function updateAppSetting(
  db: Database,
  key: string,
  value: string,
): Promise<AppSetting | null> {
  const [row] = await db
    .update(app_settings)
    .set({ value, updated_at: new Date() })
    .where(eq(app_settings.key, key))
    .returning();
  return row ? toAppSetting(row) : null;
}

function toAppSetting(row: typeof app_settings.$inferSelect): AppSetting {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    updated_at: new Date(row.updated_at).toISOString(),
  };
}
