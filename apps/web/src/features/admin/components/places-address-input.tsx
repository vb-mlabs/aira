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
//   - On mount we reach into the element's internal <input> to seed it
//     with the existing value so editors see what's stored rather than an
//     empty field. The element has no documented controlled-value API,
//     but the input is rendered in the light DOM and is reachable via
//     `querySelector('input')`.

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

  interface Window {
    google?: {
      maps?: {
        importLibrary?: (name: string) => Promise<unknown>
      }
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

  // Probe for the custom element. With `loading=async` the Maps script
  // returns just a bootstrap loader — the places library + element
  // registration only happen when something calls
  // `google.maps.importLibrary("places")`. Without that call,
  // `customElements.whenDefined("gmp-place-autocomplete")` would hang
  // forever and the 4 s timeout fired, dropping us to the plain input.
  //
  // Flow: wait for the loader stub → import the places library → wait
  // for the custom element to register → mark ready. Falls back to a
  // plain controlled input if any step times out.
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
    }, 8000)

    async function load() {
      const start = performance.now()
      while (!window.google?.maps?.importLibrary) {
        if (performance.now() - start > 6000) {
          throw new Error("Google Maps loader did not appear")
        }
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      await window.google.maps.importLibrary("places")
      await customElements.whenDefined("gmp-place-autocomplete")
    }

    load()
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

    // Seed the internal input with the existing value. The element
    // renders its <input> in the light DOM on the next tick after
    // append, so wait one frame before reaching for it.
    if (value) {
      requestAnimationFrame(() => {
        const input = el.querySelector("input")
        if (input && !input.value) input.value = value
      })
    }

    function handleSelect(event: Event) {
      // The `gmp-select` event puts `placePrediction` directly on the
      // event object (per Google's samples), not under `event.detail`.
      const placePrediction = (event as unknown as {
        placePrediction?: PlacePredictionLike
      }).placePrediction
      if (!placePrediction) return
      const place = placePrediction.toPlace()
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
    // `value` intentionally omitted from deps — it's only used as a
    // one-shot seed on mount; updating it shouldn't rebuild the element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Styling for the `<gmp-place-autocomplete>` host + its internal input
  // lives in apps/web/src/app/globals.css — Google ships internal CSS for
  // the element that needs !important to override.
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
