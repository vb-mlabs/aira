import "server-only"

// F20-community-push — per-user push sender.
//
// Sibling to sendPushBroadcast in ./push.ts, scoped to one recipient
// instead of the admin business-owner fan-out. Same Expo SDK
// underneath; same notification_delivery log rows; same
// DeviceNotRegistered cleanup. Two deliberate departures from the
// broadcast pattern:
//
//   1. Log-and-return on missing EXPO_ACCESS_TOKEN — comment/reply
//      creation is a hot end-user path and a missing env in dev
//      MUST NOT block the op. Broadcast throws because it's a
//      discrete admin action; this sender warns once and returns
//      zeros so the caller's try/catch stays silent on success.
//
//   2. 15s AbortController cap (vs broadcast's 60s). Per-request path
//      shouldn't hold the comment op open longer than that.
//
// Consumers must have ALREADY inserted the in-app notification row
// and pass its id in the message payload — this sender does NOT
// create the in-app row. The push is a delivery accelerant on top
// of the always-authoritative in-app row.

import { Expo } from "expo-server-sdk"
import type { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk"
import type { Database } from "@aira/db/client"
import { notificationDelivery } from "@aira/db/schema"
import { listDevicesForUserIds, deleteDeviceById } from "../devices"

// Services layer has no shared logger — callers wrap into their own
// context via try/catch. console.warn is the platform-neutral fallback
// for the one warn-and-return case here (missing EXPO_ACCESS_TOKEN).

const DEFAULT_ABORT_MS = 15_000

export interface SendPushToUserMessage {
  /** Notification title — shown as the push heading on both iOS + Android. */
  title: string
  /** Notification body — trimmed by the OS to ~178 chars on iOS. Caller is
   *  responsible for pre-clipping if the body might be longer. */
  body: string
  /** Structured payload delivered inside the push. The mobile tap handler
   *  reads `data.notification_id` to route the recipient into the
   *  notification detail modal. Keep it small — Expo caps push payload
   *  at 4KB. */
  data: Record<string, unknown>
  /** Notification row id (from createNotification). Used to key the
   *  per-device notification_delivery row so a future analytics read
   *  can join back to the notification. */
  notification_id: string
}

export interface SendPushToUserOptions {
  /** Caller-injected from apps/web/src/config/env.ts so this module stays
   *  env-free (AGENTS.md hard rule). Undefined → log-and-return; DOES NOT
   *  throw (see file header for rationale). */
  expoAccessToken: string | undefined
  /** Override for tests; production callers leave it default. */
  abortMs?: number
}

export interface SendPushToUserResult {
  devices_attempted: number
  devices_completed: number
  devices_pending: number
}

export async function sendPushToUser(
  db: Database,
  userId: string,
  message: SendPushToUserMessage,
  options: SendPushToUserOptions,
): Promise<SendPushToUserResult> {
  const devices = await listDevicesForUserIds(db, [userId])
  if (devices.length === 0) {
    return { devices_attempted: 0, devices_completed: 0, devices_pending: 0 }
  }

  if (!options.expoAccessToken) {
    console.warn(
      "[push_to_user] EXPO_ACCESS_TOKEN missing — skipping fan-out",
      {
        user_id: userId,
        notification_id: message.notification_id,
        device_count: devices.length,
      },
    )
    return { devices_attempted: 0, devices_completed: 0, devices_pending: 0 }
  }

  const expo = new Expo({ accessToken: options.expoAccessToken })

  const items = devices.map((device) => ({
    device,
    message: {
      to: device.expo_push_token,
      sound: "default" as const,
      title: message.title,
      body: message.body,
      data: message.data,
      // priority + channelId control Android delivery. Without them,
      // Android 8+ shows notifications in the tray only (no heads-up,
      // no lock-screen wake). The channel is created client-side at
      // apps/mobile/lib/notification-tap.ts with IMPORTANCE_HIGH so a
      // push referencing it lands with the expected UX. iOS ignores
      // channelId (harmless) and treats "high" as ready-to-deliver.
      priority: "high" as const,
      channelId: "default",
    } satisfies ExpoPushMessage,
  }))

  const messages = items.map((i) => i.message)
  const chunks = expo.chunkPushNotifications(messages)

  let cursor = 0
  let devicesCompleted = 0
  type DeliveryRow = {
    notification_id: string
    user_device_id: string
    status: "pending" | "error"
    ticket_id: string | null
    error_code: string | null
  }
  const deliveries: DeliveryRow[] = []
  const devicesToCleanup: string[] = []

  const controller = new AbortController()
  const abortMs = options.abortMs ?? DEFAULT_ABORT_MS
  const timer = setTimeout(() => controller.abort(), abortMs)

  try {
    for (const chunk of chunks) {
      if (controller.signal.aborted) break
      let tickets: ExpoPushTicket[]
      try {
        tickets = await expo.sendPushNotificationsAsync(chunk)
      } catch {
        // Network/timeout — in-flight chunk stays pending; receipt-poll
        // follow-up will reconcile when it lands.
        cursor += chunk.length
        continue
      }
      for (let i = 0; i < tickets.length; i += 1) {
        const ticket = tickets[i]
        const item = items[cursor + i]
        if (ticket.status === "ok") {
          deliveries.push({
            notification_id: message.notification_id,
            user_device_id: item.device.id,
            status: "pending",
            ticket_id: ticket.id,
            error_code: null,
          })
        } else {
          const errorCode = ticket.details?.error ?? null
          deliveries.push({
            notification_id: message.notification_id,
            user_device_id: item.device.id,
            status: "error",
            ticket_id: null,
            error_code: errorCode,
          })
          if (errorCode === "DeviceNotRegistered") {
            devicesToCleanup.push(item.device.id)
          }
        }
        devicesCompleted += 1
      }
      cursor += chunk.length
    }
  } finally {
    clearTimeout(timer)
  }

  if (deliveries.length > 0) {
    await db.insert(notificationDelivery).values(deliveries)
  }

  // Cleanup OUTSIDE the delivery write. Best-effort, idempotent —
  // mirrors sendPushBroadcast's finally pattern (F21 review decision 9).
  for (const deviceId of devicesToCleanup) {
    try {
      await deleteDeviceById(db, deviceId)
    } catch {
      // Swallow — next push will retry-then-delete.
    }
  }

  return {
    devices_attempted: items.length,
    devices_completed: devicesCompleted,
    devices_pending: items.length - devicesCompleted,
  }
}
