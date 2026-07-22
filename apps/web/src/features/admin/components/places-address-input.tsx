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
// Uses the Places API (New): `AutocompleteSuggestion.fetchAutocompleteSuggestions`
// + `Place.fetchFields`. We deliberately do NOT use the legacy
// `AutocompleteService` / `PlacesService` classes — those hit the
// old Places API endpoint, which many Google Cloud API keys have
// restricted OFF while leaving "Places API (New)" enabled (an
// ApiTargetBlockedMapError console signal). The new classes hit the
// same endpoints the `<gmp-place-autocomplete>` widget used, so any
// key that supported that widget supports this code path.

import { useCallback, useEffect, useRef, useState } from "react"
import { Input } from "@aira/ui-web/input"
import { MapPin, Loader2 } from "lucide-react"

interface Prediction {
  place_id: string
  main_text: string
  secondary_text: string
  full_text: string
}

interface PlacesAddressInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type SdkState = "loading" | "ready" | "absent"

// Minimal shape of the Places-API-New classes we touch. `@types/google.maps`
// covers this but we narrow to what we consume so the loader typings stay
// tight.
interface PlacesNewLibrary {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (
      request: {
        input: string
        sessionToken?: unknown
      },
    ) => Promise<{
      suggestions: Array<{
        placePrediction: {
          placeId: string
          text: { text: string }
          mainText?: { text: string } | null
          secondaryText?: { text: string } | null
          toPlace: () => {
            fetchFields: (opts: { fields: string[] }) => Promise<{
              place: { formattedAddress?: string | null }
            }>
          }
        } | null
      }>
    }>
  }
  AutocompleteSessionToken: new () => unknown
}

export function PlacesAddressInput({
  id,
  value,
  onChange,
  placeholder = "Start typing an address…",
}: PlacesAddressInputProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const placesLibRef = useRef<PlacesNewLibrary | null>(null)
  const sessionTokenRef = useRef<unknown>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track the last value we called onChange for internally so external
  // parent updates (form reset) don't retrigger a fetch loop.
  const lastLocalValueRef = useRef<string>(value)
  // Increments on every keystroke; only the newest fetch is allowed to
  // populate results (guards against out-of-order network responses).
  const fetchSeqRef = useRef(0)
  // Cache placePrediction objects keyed by place_id for the current
  // suggestion list, so handleSelect can call .toPlace().fetchFields()
  // directly without a second autocomplete round-trip (which would
  // both cost an extra billable call and start a new session).
  type LivePrediction = {
    toPlace: () => {
      fetchFields: (opts: { fields: string[] }) => Promise<{
        place: { formattedAddress?: string | null }
      }>
    }
  }
  const predictionMapRef = useRef<Map<string, LivePrediction>>(new Map())

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
      )) as unknown as PlacesNewLibrary
      placesLibRef.current = places
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

  const fetchPredictions = useCallback(async (input: string) => {
    const lib = placesLibRef.current
    const token = sessionTokenRef.current
    if (!lib || !token) return
    const seq = ++fetchSeqRef.current
    setLoadingPredictions(true)
    try {
      const { suggestions } =
        await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: token,
        })
      if (seq !== fetchSeqRef.current) return
      predictionMapRef.current.clear()
      const mapped: Prediction[] = suggestions.flatMap((s) => {
        const p = s.placePrediction
        if (!p) return []
        predictionMapRef.current.set(p.placeId, p)
        return [
          {
            place_id: p.placeId,
            full_text: p.text.text,
            main_text: p.mainText?.text ?? p.text.text,
            secondary_text: p.secondaryText?.text ?? "",
          },
        ]
      })
      setPredictions(mapped)
      setOpen(mapped.length > 0)
    } catch {
      // Silent: a fetch failure shouldn't spam the admin. Dropdown just
      // stays empty and the field remains a plain input for that keystroke.
      if (seq === fetchSeqRef.current) {
        setPredictions([])
        setOpen(false)
      }
    } finally {
      if (seq === fetchSeqRef.current) setLoadingPredictions(false)
    }
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

  async function handleSelect(p: Prediction) {
    const lib = placesLibRef.current
    const live = predictionMapRef.current.get(p.place_id)
    // Commit falls back to the visible full text if the details fetch
    // fails or the SDK isn't ready, so selecting always makes progress.
    const commit = (addr: string) => {
      lastLocalValueRef.current = addr
      onChange(addr)
      setOpen(false)
      // Fresh session token for the next lookup — sessions cover one
      // autocomplete-to-details flow per Google's billing model.
      if (lib) sessionTokenRef.current = new lib.AutocompleteSessionToken()
    }
    if (!lib || !live) {
      commit(p.full_text)
      return
    }
    try {
      const { place: filled } = await live.toPlace().fetchFields({
        fields: ["formattedAddress"],
      })
      commit(filled.formattedAddress ?? p.full_text)
    } catch {
      commit(p.full_text)
    }
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
