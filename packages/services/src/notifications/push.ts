import "server-only"

// F21 push broadcast orchestrator.
//
// Composes the in-app fan-out (sendBusinessOwnerBroadcast) with Expo Push
// Service delivery. Layered, not coupled: even if the Expo round-trip
// fails entirely, the audit row + bell-icon notifications stay
// authoritative. Push is a delivery accelerant on top.
//
// Decisions locked in the F21 review:
//   2. 60s AbortController cap; partial-success reporting.
//   5. Push payload `data` carries the full NotificationBody.
//   9. DeviceNotRegistered cleanup happens OUTSIDE the broadcast
//      transaction — best-effort, idempotent.

import { Expo } from "expo-server-sdk"
import type {
  ExpoPushMessage,
  ExpoPushTicket,
} from "expo-server-sdk"
import type { Database } from "@aira/db/client"
import type { CallerContext } from "@aira/api/context"
import { notificationDelivery } from "@aira/db/schema"
import {
  sendBusinessOwnerBroadcast,
  type BusinessOwnerBroadcastArgs,
  type BusinessOwnerBroadcastResult,
} from "../admin"
import {
  listDevicesForUserIds,
  deleteDeviceById,
} from "../devices"

export interface SendPushBroadcastOptions {
  /** Caller-injected from apps/web/src/config/env.ts so this module stays
   *  env-free (AGENTS.md hard rule). Undefined → push fan-out throws when
   *  there are devices to contact. */
  expoAccessToken: string | undefined
  /** Override for tests; production callers leave it default. */
  abortMs?: number
}

const DEFAULT_ABORT_MS = 60_000

export async function sendPushBroadcast(
  db: Database,
  ctx: CallerContext,
  args: BusinessOwnerBroadcastArgs,
  options: SendPushBroadcastOptions,
): Promise<BusinessOwnerBroadcastResult> {
  // In-app fan-out runs first and unconditionally. Its return value is the
  // source of truth for recipient_count + the user_id → notification_id
  // mapping the delivery log keys on.
  const inApp = await sendBusinessOwnerBroadcast(db, ctx, args)
  if (inApp.recipient_count === 0) return inApp

  const userIds = inApp.notifications.map((n) => n.user_id)
  const devices = await listDevicesForUserIds(db, userIds)
  if (devices.length === 0) return inApp

  if (!options.expoAccessToken) {
    throw new Error(
      "[notifications/push] Push delivery requires EXPO_ACCESS_TOKEN. Set it in the environment to fan out to registered devices.",
    )
  }

  const notificationIdByUserId = new Map(
    inApp.notifications.map((n) => [n.user_id, n.notification_id]),
  )

  const expo = new Expo({ accessToken: options.expoAccessToken })

  type PushItem = {
    device: (typeof devices)[number]
    notification_id: string
    message: ExpoPushMessage
  }

  // Drop devices whose owner doesn't have a paired notification row (the
  // selectDistinct in resolveTargetUserIds + cascade-on-delete races make
  // this defensive but theoretically possible).
  const items: PushItem[] = []
  for (const device of devices) {
    const notification_id = notificationIdByUserId.get(device.user_id)
    if (!notification_id) continue
    items.push({
      device,
      notification_id,
      message: {
        to: device.expo_push_token,
        sound: "default",
        title: args.title,
        body: args.message,
        data: {
          kind: "business_broadcast" as const,
          title: args.title,
          message: args.message,
        },
        // Same rationale as sendPushToUser (../push-to-user.ts) — priority
        // + channelId gate Android heads-up + lockscreen; without them
        // Android 8+ drops these to tray-only.
        priority: "high",
        channelId: "default",
      },
    })
  }

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
        // Network/timeout — the in-flight chunk's items stay pending and
        // are counted in devices_pending. The receipt follow-up plan will
        // reconcile.
        cursor += chunk.length
        continue
      }
      for (let i = 0; i < tickets.length; i += 1) {
        const ticket = tickets[i]
        const item = items[cursor + i]
        if (ticket.status === "ok") {
          deliveries.push({
            notification_id: item.notification_id,
            user_device_id: item.device.id,
            status: "pending",
            ticket_id: ticket.id,
            error_code: null,
          })
        } else {
          const errorCode = ticket.details?.error ?? null
          deliveries.push({
            notification_id: item.notification_id,
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

  // Cleanup runs OUTSIDE the broadcast transaction (F21 review decision
  // 9). Best-effort, idempotent: a failure here leaves the row in place
  // for the next fan-out to retry-then-delete.
  for (const deviceId of devicesToCleanup) {
    try {
      await deleteDeviceById(db, deviceId)
    } catch {
      // Swallow — the cleanup is best-effort; next broadcast will retry.
    }
  }

  return {
    ok: true,
    recipient_count: inApp.recipient_count,
    devices_attempted: items.length,
    devices_completed: devicesCompleted,
    devices_pending: items.length - devicesCompleted,
    notifications: inApp.notifications,
  }
}
