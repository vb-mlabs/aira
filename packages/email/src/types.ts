// Driver interface for transactional email. Drivers receive fully-rendered
// HTML and plaintext bodies — no provider-specific template aliases leak
// through this seam. This is what lets the same EmailTemplates layer drive
// Postmark today and (later) Resend / SES / Mailgun without touching call
// sites.

export interface SendArgs {
  /** Recipient address. */
  to: string
  /** Subject line. */
  subject: string
  /** Fully-rendered HTML body. */
  html: string
  /** Plaintext body (rendered alongside HTML for deliverability). */
  text: string
  /** From-name override (default comes from POSTMARK_FROM_EMAIL config). */
  fromName?: string
}

export interface SendResult {
  /** Provider's message ID (for tracing in the provider dashboard). */
  messageId: string
}

export interface EmailDriver {
  name: string
  send(args: SendArgs): Promise<SendResult>
}
