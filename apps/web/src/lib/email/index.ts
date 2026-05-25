// Public API for the email module. Use the typed wrappers from ./templates
// rather than reaching for the raw driver.

export { sendVerifyEmail, sendPasswordResetEmail, sendNotificationEmail } from "./templates"
export { getEmailDriver, _setDriverForTesting } from "./driver"
export type { EmailDriver, SendArgs, SendResult } from "./types"
