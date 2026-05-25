import { afterEach, describe, expect, it, vi } from "vitest"
import {
  _setDriverForTesting,
  sendNotificationEmail,
  sendPasswordResetEmail,
  sendVerifyEmail,
  type EmailDriver,
  type SendArgs,
} from "@/lib/email"
import { brand } from "@mlabs/config"

function recordingDriver(): { driver: EmailDriver; calls: SendArgs[] } {
  const calls: SendArgs[] = []
  const driver: EmailDriver = {
    name: "recording",
    send: vi.fn(async (args: SendArgs) => {
      calls.push(args)
      return { messageId: `recorded-${calls.length}` }
    }),
  }
  return { driver, calls }
}

afterEach(() => {
  _setDriverForTesting(null)
})

describe("sendVerifyEmail", () => {
  it("renders the verify-email template and sends rendered HTML + text", async () => {
    const { driver, calls } = recordingDriver()
    _setDriverForTesting(driver)

    await sendVerifyEmail({
      to: "alice@example.com",
      name: "Alice",
      verifyUrl: "https://app.example.com/verify-email?token=abc",
    })

    expect(calls).toHaveLength(1)
    const args = calls[0]!
    expect(args.to).toBe("alice@example.com")
    expect(args.fromName).toBe(brand.name)
    expect(args.subject).toBe(`Verify your ${brand.name} email`)
    expect(args.html).toContain("Alice")
    expect(args.html).toContain(
      "https://app.example.com/verify-email?token=abc",
    )
    expect(args.text).toContain("Alice")
    expect(args.text).toContain(
      "https://app.example.com/verify-email?token=abc",
    )
  })
})

describe("sendPasswordResetEmail", () => {
  it("renders password reset with default 60-minute expiry", async () => {
    const { driver, calls } = recordingDriver()
    _setDriverForTesting(driver)

    await sendPasswordResetEmail({
      to: "bob@example.com",
      name: "Bob",
      resetUrl: "https://app.example.com/reset?token=xyz",
    })

    const args = calls[0]!
    expect(args.subject).toBe(`Reset your ${brand.name} password`)
    expect(args.html).toContain("https://app.example.com/reset?token=xyz")
    // React Email interleaves text nodes with HTML comments, so check
    // plaintext for the literal "60 minutes" phrase.
    expect(args.text).toContain("60 minutes")
  })

  it("respects custom expiresInMinutes", async () => {
    const { driver, calls } = recordingDriver()
    _setDriverForTesting(driver)

    await sendPasswordResetEmail({
      to: "carol@example.com",
      name: "Carol",
      resetUrl: "https://app.example.com/reset?token=abc",
      expiresInMinutes: 15,
    })

    const args = calls[0]!
    expect(args.text).toContain("15 minutes")
  })
})

describe("sendNotificationEmail", () => {
  it("uses the title as the subject and renders body without a CTA", async () => {
    const { driver, calls } = recordingDriver()
    _setDriverForTesting(driver)

    await sendNotificationEmail({
      to: "dan@example.com",
      title: "Bet settled",
      body: "Your bet on team X just settled.",
    })

    const args = calls[0]!
    expect(args.subject).toBe("Bet settled")
    expect(args.html).toContain("Bet settled")
    expect(args.html).toContain("Your bet on team X just settled.")
    expect(args.text).toContain("Your bet on team X just settled.")
  })

  it("renders the CTA when ctaLabel + ctaUrl are provided", async () => {
    const { driver, calls } = recordingDriver()
    _setDriverForTesting(driver)

    await sendNotificationEmail({
      to: "eve@example.com",
      title: "New signal",
      body: "A new signal you might like.",
      ctaLabel: "View signal",
      ctaUrl: "https://app.example.com/signals/42",
    })

    const args = calls[0]!
    expect(args.html).toContain("View signal")
    expect(args.html).toContain("https://app.example.com/signals/42")
  })
})

describe("driver failures bubble", () => {
  it("rejects when the driver throws (so the auth flow can surface a retry)", async () => {
    const driver: EmailDriver = {
      name: "broken",
      send: vi.fn(async () => {
        throw new Error("postmark down")
      }),
    }
    _setDriverForTesting(driver)

    await expect(
      sendVerifyEmail({
        to: "frank@example.com",
        name: "Frank",
        verifyUrl: "https://app.example.com/verify",
      }),
    ).rejects.toThrow("postmark down")
  })
})
