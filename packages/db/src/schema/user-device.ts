// Registered Expo Push Token per user. Multi-device by design — a user with
// phone + tablet gets two rows. Unique on (user_id, expo_push_token) so
// re-registration is upsert. last_seen_at is bumped on every successful
// re-register; stale tokens are pruned by fan-out time when Expo returns
// DeviceNotRegistered (cleanup happens via deleteDeviceById, outside the
// broadcast transaction — see F21 review).

import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"
import { user } from "./auth"

export const userDevice = pgTable(
  "user_device",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Format: ExponentPushToken[XXX] or ExpoPushToken[XXX]. Expo treats both
     *  forms as equivalent; we store as-is. */
    expo_push_token: text("expo_push_token").notNull(),
    platform: text("platform").notNull(), // "ios" | "android"
    last_seen_at: timestamp("last_seen_at").defaultNow().notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_device_token_uq").on(
      table.user_id,
      table.expo_push_token,
    ),
    index("user_device_user_idx").on(table.user_id),
  ],
)
