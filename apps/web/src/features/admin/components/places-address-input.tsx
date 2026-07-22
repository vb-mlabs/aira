"use client"

// Places autocomplete against a plain `<Input>` + our own dropdown.
// Replaces the earlier `<gmp-place-autocomplete>` widget, which
// misbehaved inside AdminFormModal: the modal's translate(-50%,-50%)
// centering created a new containing block, and the widget's internal
// `position: fixed` dropdown resolved modal-relative instead of
// viewport-relative — flipping upward and clipping on the right. We
// couldn't drop the transform without breaking every other admin
// dialog's centering.
//
// Using `google.maps.places.AutocompleteService` + `PlacesService.getDetails`
// (the classic API, not deprecated for existing customers). We own the
// input styling (matches every other admin input via the shared
// primitive) and the dropdown layout, so the layout and z-index quirks
// of the shadow-DOM widget are no longer in play.

import { useCallback, useEffect, useRef, useState } from "react"
import { Input } from "@aira/ui-web/input"
import { MapPin, Loader2 } from "lucide-react"

interface Prediction {
  place_id: string
  description: string
  main_text: string
  secondary_text: string
}

interface PlacesAddressInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type SdkState = "loading" | "ready" | "absent"

export function PlacesAddressInput({
  id,
  value,
  onChange,
  placeholder = "Start typing an address…",
}: PlacesAddressInputProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  // AutocompleteService returns predictions; PlacesService.getDetails
  // turns a place_id into the formatted address. Session token groups
  // both into one billable session per Google's pricing model.
  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track the last value we called onChange for internally so external
  // parent updates (form reset) don't retrigger a fetch loop.
  const lastLocalValueRef = useRef<string>(value)

  const [sdkState, setSdkState] = useState<SdkState>("loading")
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const [loadingPredictions, setLoadingPredictions] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") {
      setSdkState("absent")
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
        await new Promise((r) => setTimeout(r, 50))
      }
      const places = (await window.google.maps.importLibrary(
        "places",
      )) as google.maps.PlacesLibrary
      autocompleteServiceRef.current = new places.AutocompleteService()
      // PlacesService needs an attribution container; a detached div
      // works fine and is never rendered.
      placesServiceRef.current = new places.PlacesService(
        document.createElement("div"),
      )
      sessionTokenRef.current = new places.AutocompleteSessionToken()
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

  const fetchPredictions = useCallback((input: string) => {
    const svc = autocompleteServiceRef.current
    const token = sessionTokenRef.current
    if (!svc || !token) return
    setLoadingPredictions(true)
    svc.getPlacePredictions({ input, sessionToken: token }, (results) => {
      setLoadingPredictions(false)
      if (!results) {
        setPredictions([])
        setOpen(false)
        return
      }
      const mapped: Prediction[] = results.map((r) => ({
        place_id: r.place_id,
        description: r.description,
        main_text: r.structured_formatting?.main_text ?? r.description,
        secondary_text: r.structured_formatting?.secondary_text ?? "",
      }))
      setPredictions(mapped)
      setOpen(mapped.length > 0)
    })
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    lastLocalValueRef.current = v
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (sdkState !== "ready") return
    if (!v.trim()) {
      setPredictions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => fetchPredictions(v), 250)
  }

  function handleSelect(p: Prediction) {
    const svc = placesServiceRef.current
    const token = sessionTokenRef.current
    if (!svc || !token) {
      lastLocalValueRef.current = p.description
      onChange(p.description)
      setOpen(false)
      return
    }
    svc.getDetails(
      {
        placeId: p.place_id,
        fields: ["formatted_address"],
        sessionToken: token,
      },
      (place) => {
        const addr = place?.formatted_address ?? p.description
        lastLocalValueRef.current = addr
        onChange(addr)
        setOpen(false)
        // Start a fresh session for the next lookup — sessions cover
        // one autocomplete-to-details flow per Google's billing.
        const g = window.google?.maps?.places
        if (g) sessionTokenRef.current = new g.AutocompleteSessionToken()
      },
    )
  }

  // Close the dropdown when clicking anywhere outside the wrapper.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const wrap = wrapRef.current
      if (!wrap) return
      if (!wrap.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  // SDK absent → plain controlled input, no autocomplete. Same UX as
  // the fallback in the previous widget-based implementation.
  if (sdkState === "absent") {
    return (
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    )
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => {
          if (predictions.length > 0) setOpen(true)
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-[var(--shadow-card)]"
        >
          {predictions.map((p) => (
            <li
              key={p.place_id}
              role="option"
              aria-selected={false}
              // onMouseDown fires before input blur, so the click
              // registers even though clicking the item takes focus
              // away from the input (which would otherwise trigger
              // outside-click close before the handler runs).
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(p)
              }}
              className="flex cursor-pointer items-start gap-2 border-b border-border/60 px-3 py-2 last:border-b-0 hover:bg-accent"
            >
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-popover-foreground">
                  {p.main_text}
                </div>
                {p.secondary_text && (
                  <div className="truncate text-xs text-muted-foreground">
                    {p.secondary_text}
                  </div>
                )}
              </div>
            </li>
          ))}
          {/* "Powered by Google" — required by Places ToS whenever
              predictions are shown without a Google map on the page. */}
          <li className="border-t border-border bg-muted/30 px-3 py-1.5 text-right text-[10px] text-muted-foreground">
            Powered by Google
          </li>
        </ul>
      )}
      {loadingPredictions && (
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            aria-hidden
          />
        </div>
      )}
    </div>
  )
}
