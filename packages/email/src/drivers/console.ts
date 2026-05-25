import "server-only"

// Dev fallback driver: logs the email to console instead of sending.
// Active when no postmark token is configured. The plaintext preview lets
// devs grab verify URLs / reset tokens / CTA links from the log without
// pulling up the rendered HTML.

import type { EmailDriver, SendArgs, SendResult } from "../types"

const PREVIEW_CHARS = 200

export const consoleDriver: EmailDriver = {
  name: "console",
  async send(args: SendArgs): Promise<SendResult> {
    const preview = args.text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, PREVIEW_CHARS)
    console.log("[email/console]", {
      to: args.to,
      subject: args.subject,
      preview,
    })
    return { messageId: `console-${Date.now()}` }
  },
}
