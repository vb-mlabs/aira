"use client"

// Google Places Autocomplete address widget.
//
// Requires window.google.maps.places to be loaded via the <Script> tag in
// the admin layout (injected only when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is
// set). Falls back to a plain <Input> when the SDK is absent so the form
// stays usable without a key.

import { useEffect, useRef } from "react"
import { Input } from "@aira/ui-web/input"

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
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return

    // Guard: Places SDK may not be loaded (no API key, or still loading).
    if (
      typeof window === "undefined" ||
      !window.google?.maps?.places?.Autocomplete
    ) {
      return
    }

    const ac = new window.google.maps.places.Autocomplete(el, {
      types: ["address"],
      fields: ["formatted_address"],
    })
    autocompleteRef.current = ac

    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace()
      if (place.formatted_address) {
        onChange(place.formatted_address)
      }
    })

    return () => {
      window.google.maps.event.removeListener(listener)
      autocompleteRef.current = null
    }
  }, [onChange])

  return (
    <Input
      ref={inputRef}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
    />
  )
}
