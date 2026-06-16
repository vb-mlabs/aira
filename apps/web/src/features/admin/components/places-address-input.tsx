"use client"

// Google Places Autocomplete address widget — migrated 2026-06-15 to the
// new `<gmp-place-autocomplete>` Web Component (PlaceAutocompleteElement).
// The legacy `google.maps.places.Autocomplete` constructor is in deprecation
// (Mar 2025 notice; no removal date but new customers can't use it).
//
// Loading model:
//   - The admin layout injects the Maps JS API <script> with libraries=places
//     + loading=async + v=weekly only when GOOGLE_MAPS_API_KEY is set.
//   - When the SDK loads, `<gmp-place-autocomplete>` registers itself as a
//     custom element. We poll `customElements.whenDefined(...)` and fall
//     back to a plain <Input> after 4 s if registration never completes.
//   - Existing addresses are surfaced as a small "Current: <addr>" hint
//     below the picker so admins know what's stored without us trying to
//     pre-populate the custom element's internal input (the element has
//     no controlled-value API — it's deliberately uncontrolled).

import { useEffect, useRef, useState } from "react"
import { Input } from "@aira/ui-web/input"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "gmp-place-autocomplete": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          placeholder?: string
        },
        HTMLElement
      >
    }
  }
}

/** Minimal shape of `google.maps.places.PlacePrediction` we touch — typing
 *  `@types/google.maps` for the new element wasn't stable at migration
 *  time, so we narrow to just the bit we use. */
interface PlacePredictionLike {
  toPlace: () => {
    fetchFields: (opts: { fields: string[] }) => Promise<unknown>
    formattedAddress?: string
  }
}

interface PlacesAddressInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function PlacesAddressInput({
  id,
  value,
  onChange,
  placeholder = "Start typing an address…",
}: PlacesAddressInputProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [sdkState, setSdkState] = useState<"loading" | "ready" | "absent">(
    "loading",
  )

  // Probe for the custom element. If it doesn't register within 4 s, give
  // up and surface a plain text input — that's the same fallback the
  // legacy widget used when the key was missing. The set-state-in-effect
  // rule's preferred pattern is for prop-mirroring; we're synchronising
  // with an external SDK load, so direct setState is the right shape.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined" || typeof customElements === "undefined") {
      setSdkState("absent")
      return
    }
    if (customElements.get("gmp-place-autocomplete")) {
      setSdkState("ready")
      return
    }
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) setSdkState("absent")
    }, 4000)
    customElements
      .whenDefined("gmp-place-autocomplete")
      .then(() => {
        if (cancelled) return
        clearTimeout(timeout)
        setSdkState("ready")
      })
      .catch(() => {
        if (!cancelled) setSdkState("absent")
      })
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Mount the element imperatively so we own the gmp-select listener and
  // attribute setup without having to round-trip through React render.
  useEffect(() => {
    const container = containerRef.current
    if (!container || sdkState !== "ready") return

    container.innerHTML = ""
    const el = document.createElement("gmp-place-autocomplete") as HTMLElement
    if (id) el.id = id
    el.setAttribute("placeholder", placeholder)
    container.appendChild(el)

    function handleSelect(event: Event) {
      const detail = (event as CustomEvent<{ placePrediction: PlacePredictionLike }>)
        .detail
      const place = detail.placePrediction.toPlace()
      place
        .fetchFields({ fields: ["formattedAddress"] })
        .then(() => {
          if (place.formattedAddress) onChange(place.formattedAddress)
        })
        .catch(() => {
          // Silent: a place fetch failure shouldn't break the form. The
          // admin can retry by picking another suggestion.
        })
    }

    el.addEventListener("gmp-select", handleSelect)
    return () => {
      el.removeEventListener("gmp-select", handleSelect)
      // Don't clear container.innerHTML on cleanup — React strict-mode
      // double-mount would race against the next mount.
    }
  }, [sdkState, id, placeholder, onChange])

  // SDK absent → identical UX to pre-migration: plain controlled input.
  if (sdkState === "absent") {
    return (
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    )
  }

  return (
    <div className="space-y-1.5">
      <div ref={containerRef} />
      {value && (
        <p className="text-xs text-muted-foreground">
          Current:{" "}
          <span className="text-foreground">{value}</span>
        </p>
      )}
    </div>
  )
}
