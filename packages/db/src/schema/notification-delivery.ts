// Per-device push delivery log. One row per (notification, device) attempt.
// status is text-typed by convention (matches notifications.type) with Zod
// validation at the service boundary — see F21 review decision 10.
//
//   pending → Expo accepted the ticket; receipt not yet confirmed.
//   ok      → set by the receipt-polling follow-up (not v1).
//   error   → ticket or receipt reported a failure; error_code carries the
//             reason (DeviceNotRegistered, MessageRateExceeded, etc.).

import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { notifications } from "./notifications"
import { userDevice } from "./user-device"

export const notificationDelivery = pgTable(
  "notification_delivery",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    notification_id: text("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    user_device_id: text("user_device_id")
      .notNull()
      .references(() => userDevice.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    ticket_id: text("ticket_id"),
    error_code: text("error_code"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_delivery_notification_idx").on(table.notification_id),
    index("notification_delivery_device_idx").on(table.user_device_id),
  ],
)
