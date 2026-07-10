"use client"

// Boxed cream callout with the "Be among the first 100 neighbors" headline +
// inline email form. Lives inside <Hero> on the landing page; reusable as a
// standalone section if we add a footer-capture later (the `source` prop
// distinguishes the capture point — see @aira/validators/waitlist).
//
// Honeypot input `_h` is visually hidden via inline styles (not Tailwind —
// we want explicit aria-hidden + tabIndex=-1 + offscreen positioning so it
// never reaches a real user). Bots fill every input; non-empty `_h` →
// 200-silent on the server.

import { useId, useState } from "react"
import { LiteYouTube } from "./lite-youtube"

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string }

type WaitlistCardProps = {
  source?: "marketing-hero" | "marketing-footer" | "business-mailto"
  id?: string
}

export function WaitlistCard({
  source = "marketing-hero",
  id = "notify",
}: WaitlistCardProps) {
  const emailId = useId()
  const honeypotId = useId()
  const [email, setEmail] = useState("")
  const [honeypot, setHoneypot] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status.kind === "submitting") return
    setStatus({ kind: "submitting" })

    try {
      const res = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, _h: honeypot }),
      })

      if (res.ok) {
        setStatus({ kind: "success" })
        return
      }

      const payload = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      const msg = payload?.error?.message ?? "Something went wrong. Try again."
      setStatus({ kind: "error", message: msg })
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Check your connection and try again.",
      })
    }
  }

  return (
    <div
      id={id}
      className="mx-auto mt-12 w-full max-w-[620px] rounded-3xl border border-[color:oklch(0.66_0.10_80_/_45%)] bg-card p-10 text-center shadow-[0_20px_40px_-20px_oklch(0.25_0.04_60_/_25%)] md:p-11"
    >
      {status.kind === "success" ? (
        <div className="space-y-3">
          <p className="font-display text-2xl font-semibold leading-tight text-foreground md:text-3xl">
            Thanks &mdash; you&rsquo;re on the list.
          </p>
          <p className="text-sm text-muted-foreground">
            Look for one email from us, the day AIRA opens in Atlanta.
          </p>
        </div>
      ) : (
        <>
          <LiteYouTube
            videoId="DnmolbDEcVE"
            title="Watch: what is AIRA?"
            posterAlt="Play the 60-second AIRA intro video"
            caption="60-second intro"
            className="mx-auto mb-6 max-w-[320px]"
          />
          <h3 className="font-display text-2xl font-semibold leading-tight text-foreground md:text-3xl">
            Be among the first{" "}
            <em className="font-bold not-italic italic text-primary">
              100 users
            </em>{" "}
            to know.
          </h3>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            We&rsquo;ll email you exactly once: the day AIRA opens in Atlanta.
          </p>

          <form
            onSubmit={onSubmit}
            className="mx-auto mt-6 flex max-w-[460px] flex-col gap-2 sm:flex-row"
          >
            <label htmlFor={emailId} className="sr-only">
              Email address
            </label>
            <input
              id={emailId}
              type="email"
              required
              autoComplete="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status.kind === "submitting"}
              className="flex-1 rounded-full border border-border bg-background px-[18px] py-[14px] font-sans text-[15px] text-foreground outline-none transition-[box-shadow,border-color] focus:border-primary focus:shadow-[0_0_0_3px_oklch(0.46_0.07_132_/_20%)] disabled:opacity-60"
            />

            {/* Honeypot — hidden from humans, must stay empty. Bots fill it. */}
            <label
              htmlFor={honeypotId}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-9999px",
                width: "1px",
                height: "1px",
                overflow: "hidden",
              }}
            >
              Leave this field blank
            </label>
            <input
              id={honeypotId}
              type="text"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{
                position: "absolute",
                left: "-9999px",
                width: "1px",
                height: "1px",
                opacity: 0,
              }}
            />

            <button
              type="submit"
              disabled={status.kind === "submitting"}
              className="whitespace-nowrap rounded-full bg-[image:var(--gradient-primary)] px-6 py-[14px] font-sans text-sm font-bold tracking-[0.3px] text-primary-foreground shadow-[var(--shadow-primary-glow)] transition-transform hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {status.kind === "submitting" ? "Sending…" : "Notify me at launch"}
            </button>
          </form>

          {status.kind === "error" ? (
            <div
              role="alert"
              className="mx-auto mt-4 inline-flex items-center gap-2 rounded-lg bg-[color:oklch(0.55_0.22_27_/_10%)] px-3 py-2 text-sm font-semibold text-destructive"
            >
              <span aria-hidden="true">⚠</span>
              <span>{status.message}</span>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-muted-foreground">
            No spam, no resale. Operated by Nisarga Group LLC.
          </p>
        </>
      )}
    </div>
  )
}
