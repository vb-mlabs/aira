import "server-only"

// Admin user-direct push broadcast — sibling to ./push.ts (owner-scoped
// broadcast) but scoped to user_device rows directly and returns a
// per-platform breakdown for delivery-triage.
//
// Primary use is debugging push delivery: an admin sends an iOS-only
// or Android-only test blast, then reads the by_platform + error-code
// counts on the Sent step to distinguish send-side failures (Expo
// rejected the whole audience) from receive-side / per-device failures
// (DeviceNotRegistered → stale tokens, InvalidCredentials → APNs key
// misconfigured, MessageTooBig → payload issue, etc).
//
// Layered on top of sendUserBroadcast — the in-app fan-out + audit
// row is authoritative even if the Expo round-trip fails entirely.
// Push is a delivery accelerant.
//
// Deliberate departures from sendPushBroadcast (owner):
//   - by_platform target additionally filters devices — a user with
//     both iOS + Android devices only receives the blast on the
//     requested platform when the audience narrows.
//   - Per-platform counters (attempted / completed / pending) so the
//     admin sees the split without a post-hoc SQL query.
//   - error_code_counts map so the admin sees the shape of failure
//     (10 DeviceNotRegistered vs 1 InvalidCredentials tells very
//     different stories about the delivery loop).
//
// Not a refactor of push.ts by design — the owner broadcast is stable
// production code and doesn't need to re-carry perf risk from a
// generalisation pass. If a third caller lands, extract then.

import { Expo } from "expo-server-sdk"
import type { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk"
import type { Database } from "@aira/db/client"
import type { CallerContext } from "@aira/api/context"
import { notificationDelivery } from "@aira/db/schema"
import type { SendUserBroadcastOutput } from "@aira/validators"
import {
  sendUserBroadcast,
  type UserBroadcastArgs,
} from "../admin"
import { listDevicesForUserIds, deleteDeviceById } from "../devices"

export interface SendUserPushBroadcastOptions {
  /** Caller-injected from apps/web/src/config/env.ts so this module
   *  stays env-free (AGENTS.md hard rule). Undefined → throws when
   *  there are devices to contact. Debug-tool use case argues loudly
   *  against silent log-and-return here: an admin who thinks 0
   *  devices were pushed to when actually the token was missing
   *  would draw the wrong conclusion about delivery health. */
  expoAccessToken: string | undefined
  /** Override for tests; production callers leave it default. */
  abortMs?: number
}

const DEFAULT_ABORT_MS = 60_000

type PlatformKey = "ios" | "android"

function emptyPlatformCounters() {
  return {
    ios: { devices_attempted: 0, devices_completed: 0, devices_pending: 0 },
    android: {
      devices_attempted: 0,
      devices_completed: 0,
      devices_pending: 0,
    },
  }
}

export async function sendUserPushBroadcast(
  db: Database,
  ctx: CallerContext,
  args: UserBroadcastArgs,
  options: SendUserPushBroadcastOptions,
): Promise<SendUserBroadcastOutput> {
  // In-app fan-out + audit ALWAYS runs first. Its return value is the
  // source of truth for recipient_count and the user_id →
  // notification_id map the delivery log keys on.
  const inApp = await sendUserBroadcast(db, ctx, args)

  const empty: SendUserBroadcastOutput = {
    ok: true,
    recipient_count: inApp.recipient_count,
    by_platform: emptyPlatformCounters(),
    error_code_counts: {},
  }

  if (inApp.recipient_count === 0) return empty

  const userIds = inApp.notifications.map((n) => n.user_id)
  const allDevices = await listDevicesForUserIds(db, userIds)

  // For by_platform targets, narrow the device list to only the
  // requested platform — a user with both iOS + Android devices
  // shouldn't receive an "iOS-only" push on their Android device.
  // Hoist target.platform out of the closure so TS keeps the narrowing.
  const platformFilter =
    args.target.kind === "by_platform" ? args.target.platform : null
  const devices = platformFilter
    ? allDevices.filter((d) => d.platform === platformFilter)
    : allDevices

  if (devices.length === 0) return empty

  if (!options.expoAccessToken) {
    throw new Error(
      "[notifications/push-users] Push delivery requires EXPO_ACCESS_TOKEN. Set it in the environment to fan out to registered devices.",
    )
  }

  const notificationIdByUserId = new Map(
    inApp.notifications.map((n) => [n.user_id, n.notification_id]),
  )

  const expo = new Expo({ accessToken: options.expoAccessToken })

  type PushItem = {
    device: (typeof devices)[number]
    notification_id: string
    platformBucket: PlatformKey | null
    message: ExpoPushMessage
  }

  const items: PushItem[] = []
  for (const device of devices) {
    const notification_id = notificationIdByUserId.get(device.user_id)
    if (!notification_id) continue
    const platformBucket: PlatformKey | null =
      device.platform === "ios" || device.platform === "android"
        ? device.platform
        : null
    items.push({
      device,
      notification_id,
      platformBucket,
      message: {
        to: device.expo_push_token,
        sound: "default",
        title: args.title,
        body: args.message,
        // notification_id in data drives the mobile tap handler
        // (apps/mobile/lib/notification-tap.ts) — recipient lands on
        // the notification detail modal. kind='admin_user_broadcast'
        // is a hint for future consumers; the mobile handler doesn't
        // branch on it today.
        data: {
          kind: "admin_user_broadcast" as const,
          notification_id,
          title: args.title,
          message: args.message,
        },
        // Same rationale as sendPushToUser — priority + channelId
        // gate Android heads-up + lockscreen; without them Android
        // 8+ drops these to tray-only. iOS ignores channelId.
        priority: "high",
        channelId: "aira_alerts_v1",
      },
    })
  }

  // Bucket attempted counts up-front so mid-loop abort can subtract
  // completed to yield an accurate pending split without needing to
  // track pending explicitly.
  const byPlatform = emptyPlatformCounters()
  for (const item of items) {
    if (item.platformBucket) {
      byPlatform[item.platformBucket].devices_attempted += 1
    }
  }

  const messages = items.map((i) => i.message)
  const chunks = expo.chunkPushNotifications(messages)

  let cursor = 0
  type DeliveryRow = {
    notification_id: string
    user_device_id: string
    status: "pending" | "error"
    ticket_id: string | null
    error_code: string | null
  }
  const deliveries: DeliveryRow[] = []
  const devicesToCleanup: string[] = []
  const errorCodeCounts: Record<string, number> = {}

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
        // Network/timeout — the in-flight chunk's items stay
        // 'pending' by omission from completed counters. Cursor
        // advances so subsequent chunks address the right items.
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
          if (item.platformBucket) {
            byPlatform[item.platformBucket].devices_completed += 1
          }
        } else {
          const errorCode = ticket.details?.error ?? "unknown"
          deliveries.push({
            notification_id: item.notification_id,
            user_device_id: item.device.id,
            status: "error",
            ticket_id: null,
            error_code: errorCode,
          })
          errorCodeCounts[errorCode] = (errorCodeCounts[errorCode] ?? 0) + 1
          if (item.platformBucket) {
            byPlatform[item.platformBucket].devices_completed += 1
          }
          if (errorCode === "DeviceNotRegistered") {
            devicesToCleanup.push(item.device.id)
          }
        }
      }
      cursor += chunk.length
    }
  } finally {
    clearTimeout(timer)
  }

  // pending = attempted - completed, per platform.
  for (const p of ["ios", "android"] as const) {
    byPlatform[p].devices_pending =
      byPlatform[p].devices_attempted - byPlatform[p].devices_completed
  }

  if (deliveries.length > 0) {
    await db.insert(notificationDelivery).values(deliveries)
  }

  // Cleanup OUTSIDE the transaction (mirrors sendPushBroadcast).
  // Best-effort, idempotent — a failure here leaves the row in place
  // for the next fan-out to retry-then-delete.
  for (const deviceId of devicesToCleanup) {
    try {
      await deleteDeviceById(db, deviceId)
    } catch {
      // Swallow — next broadcast will retry.
    }
  }

  return {
    ok: true,
    recipient_count: inApp.recipient_count,
    by_platform: byPlatform,
    error_code_counts: errorCodeCounts,
  }
}
