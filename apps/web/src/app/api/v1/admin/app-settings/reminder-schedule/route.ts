// F17 — dedicated reminder-schedule REST surface.
//
// GET   → current value + parsed windows
// PATCH → admin-only Zod-validated update, audit-logged

import {
  getReminderScheduleOp,
  updateReminderScheduleOp,
} from "@/server/operations/app-settings-admin"

export const runtime = "nodejs"

export const GET = getReminderScheduleOp.runFromRequest
export const PATCH = updateReminderScheduleOp.runFromRequest
