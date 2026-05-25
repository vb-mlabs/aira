// Transitional shim — instantiates @mlabs/email/templates with the app's
// brand config + singleton driver. Re-exports the typed send helpers and the
// URL builders so existing imports from "@/lib/email" keep working.

import "server-only"
import { brand } from "@mlabs/config"
import { createTemplates } from "@mlabs/email/templates"
import { getEmailDriver } from "./driver"

// Re-exported so call sites that compose CTA URLs do it through the helpers
// instead of `${env.BETTER_AUTH_URL}/path?token=${tok}` string concat.
export { buildAppLinkUrl, buildAuthUrl } from "./url"

const templates = createTemplates({
  getDriver: () => getEmailDriver(),
  brandName: brand.name,
})

export const sendVerifyEmail = templates.sendVerifyEmail
export const sendPasswordResetEmail = templates.sendPasswordResetEmail
export const sendNotificationEmail = templates.sendNotificationEmail
