"use client"

// Client-side URL field with lenient inline validation and auto-protocol
// on blur. Accepts every shape admins actually paste from a browser bar
// — `https://foo.com`, `http://foo.com`, `www.foo.com`, `foo.com/path`,
// `sub.foo.com` — then normalizes to `https://…` on blur so the server's
// `z.url()` in packages/validators always sees a well-formed URL.
//
// Validation timing: silent during typing (so the field doesn't scream
// while the user is still composing), then evaluated on blur — that's
// when the red border + error text appear if the value doesn't look
// like a URL. `touched` also flips to true when the parent's form
// submits and re-focuses this field, but the simplest hook is the
// user's own blur.
//
// Empty is always fine — every URL field on the business form is
// nullable/optional. Only non-empty garbage triggers the error state.

import { useState } from "react"
import { Input } from "@aira/ui-web/input"

interface UrlInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const HAS_PROTOCOL = /^https?:\/\//i

/** Empty OR parses as a URL (adding `https://` if missing) whose hostname
 *  has at least one dot. That last check is what rejects pure garbage
 *  ("asdf", "hello world") — the URL parser is happy to accept any single
 *  token as a hostname, so we need the dot to demand a TLD-ish shape. */
export function isPlausibleUrl(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return true
  const candidate = HAS_PROTOCOL.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(candidate)
    const host = u.hostname
    return host.includes(".") && !host.startsWith(".") && !host.endsWith(".")
  } catch {
    return false
  }
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  return HAS_PROTOCOL.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function UrlInput({ id, value, onChange, placeholder }: UrlInputProps) {
  const [touched, setTouched] = useState(false)
  const trimmed = value.trim()
  const showError = touched && trimmed !== "" && !isPlausibleUrl(value)
  const errorId = id ? `${id}-error` : undefined

  function handleBlur() {
    setTouched(true)
    // On a valid URL missing the protocol (`www.foo.com`, `foo.com`),
    // promote to `https://…` so the server-side z.url() accepts it and
    // any later `<a href>` render doesn't relative-resolve inside our
    // domain. Silent when already prefixed or empty or invalid.
    if (trimmed && isPlausibleUrl(value) && !HAS_PROTOCOL.test(trimmed)) {
      onChange(normalizeUrl(value))
    }
  }

  return (
    <>
      <Input
        id={id}
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? errorId : undefined}
        autoComplete="url"
      />
      {showError && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          Enter a valid URL (e.g. https://example.com or www.example.com)
        </p>
      )}
    </>
  )
}
