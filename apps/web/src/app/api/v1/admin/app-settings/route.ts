import { getAppSettingsOp, updateAppSettingOp } from "@/server/operations/app-settings-admin"

export const runtime = "nodejs"

export const GET = getAppSettingsOp.runFromRequest
export const PATCH = updateAppSettingOp.runFromRequest
