// POST /api/notifications/mark-all-read — marks every unread row for the
// current user as read. Wired through the @mlabs/api operation adapter
// (Phase 4 vertical slice); the Server Action counterpart at
// src/features/notifications/server-actions.ts shares the same service
// function under the hood and revalidates the inbox page on success.

import { markAllReadOp } from "@/server/operations/notifications"

export const runtime = "nodejs"

export const POST = markAllReadOp.runFromRequest
