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
//   - The element has no documented controlled-value API. Older SDK
//     versions rendered the inner <input> in the light DOM; newer ones
//     put it inside Shadow DOM. `getInternalInput()` reaches into both.
//     We seed on mount, re-seed when `value` changes externally, and
//     write the selected place's formatted address back after gmp-select
//     so the visible field always matches parent state.

import { useEffect, useRef, useState } from "react"
import { Input } from "@aira/ui-web/input"

/** Returns the widget's internal <input>, whether Google renders it in
 *  the light DOM (older SDK) or inside Shadow DOM (v=weekly, late 2026+). */
function getInternalInput(el: HTMLElement): HTMLInputElement | null {
  return (
    (el.shadowRoot?.querySelector("input") as HTMLInputElement | null) ??
    (el.querySelector("input") as HTMLInputElement | null)
  )
}

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
  const elementRef = useRef<HTMLElement | null>(null)
  // Track the last value we wrote INTO the input so we don't overwrite the
  // user's in-progress typing. External value changes (form reset, parent
  // re-seed, gmp-select result) need to be reflected; local typing does not.
  const lastWrittenValueRef = useRef<string>("")
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
    elementRef.current = el

    // Seed the internal input with the existing value. Two ticks: the
    // element may attach its shadow root asynchronously after append.
    const seedValue = value
    if (seedValue) {
      requestAnimationFrame(() => {
        const input = getInternalInput(el)
        if (input && !input.value) {
          input.value = seedValue
          lastWrittenValueRef.current = seedValue
        }
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
          if (!place.formattedAddress) return
          onChange(place.formattedAddress)
          // Write the selected address into the visible input so the
          // field reflects what was picked. The element does not always
          // populate its own input from the selected place across SDK
          // versions, and we don't want to depend on that.
          const input = getInternalInput(el)
          if (input) {
            input.value = place.formattedAddress
            lastWrittenValueRef.current = place.formattedAddress
          }
        })
        .catch(() => {
          // Silent: a place fetch failure shouldn't break the form. The
          // admin can retry by picking another suggestion.
        })
    }

    el.addEventListener("gmp-select", handleSelect)
    return () => {
      el.removeEventListener("gmp-select", handleSelect)
      elementRef.current = null
      // Don't clear container.innerHTML on cleanup — React strict-mode
      // double-mount would race against the next mount.
    }
    // `value` used only as one-shot mount seed; external changes are
    // handled by the sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkState, id, placeholder, onChange])

  // Sync external value changes (form reset, parent re-seed) into the
  // internal input without rebuilding the element. Skips when the value
  // already matches what we last wrote — that means the change came from
  // local typing or our own onChange, not an external mutation.
  useEffect(() => {
    const el = elementRef.current
    if (!el) return
    if (value === lastWrittenValueRef.current) return
    const input = getInternalInput(el)
    if (!input) return
    input.value = value
    lastWrittenValueRef.current = value
  }, [value])

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

  // Own the border/ring on this wrapper (focus-within reacts to focus on
  // the widget's internal input, even through Shadow DOM). The widget
  // itself is styled borderless in globals.css so only this wrapper's
  // outline is visible. Matches the `<Input>` primitive at
  // packages/ui-web/src/components/input.tsx.
  return (
    <div className="h-[45px] w-full rounded-2xl border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
