"use client"

// Visibility-gated polling fetcher.
//
// Used by NotificationBell, the messages inbox, and an open thread — three
// callers with the same contract: hit a JSON endpoint every N ms, skip while
// the tab is backgrounded, ignore overlapping requests, and survive 401s
// quietly (no toasts; the next poll will retry).
//
// Returns the latest parsed body, plus a `refetch` for explicit triggers
// (e.g. after the user marks a thread read, refresh the bell immediately).

import { useEffect, useRef, useState, useCallback } from "react"

export interface UsePolledFetchOptions {
  /** Endpoint URL. */
  url: string
  /** Polling interval in milliseconds. */
  intervalMs: number
  /** If false, the hook is a no-op (useful for "pause polling while editing"). */
  enabled?: boolean
}

export interface UsePolledFetchResult<T> {
  data: T | null
  /** True while the very first fetch is in flight (initial render shows skeleton). */
  initialLoading: boolean
  /** Trigger a fetch right now, outside the interval. */
  refetch: () => void
}

export function usePolledFetch<T>(
  opts: UsePolledFetchOptions,
): UsePolledFetchResult<T> {
  const { url, intervalMs, enabled = true } = opts
  const [data, setData] = useState<T | null>(null)
  // `enabled=false` callers (e.g. "pause polling while editing") never see a
  // skeleton; they were never going to fetch. Deriving from the prop avoids
  // a setState-in-effect cascade flagged by react-hooks/set-state-in-effect.
  const [initialLoading, setInitialLoading] = useState(enabled)
  const inFlight = useRef(false)
  const mounted = useRef(true)

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return
    }
    inFlight.current = true
    try {
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) return
      const body = (await res.json()) as T
      if (mounted.current) setData(body)
    } catch {
      // Network blips swallowed — caller surfaces stale state, not error.
    } finally {
      inFlight.current = false
      if (mounted.current) setInitialLoading(false)
    }
  }, [url])

  useEffect(() => {
    mounted.current = true
    if (!enabled) {
      return () => {
        mounted.current = false
      }
    }

    // The effect is the *subscription* to an external system (the polled
    // endpoint). Calling fetchOnce here kicks off the initial sync; the
    // setState inside is exactly what the rule's docs describe as the
    // correct shape ("calling setState in a callback function when external
    // state changes"). The rule's heuristic flags the call statically.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce()
    const id = setInterval(fetchOnce, intervalMs)

    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchOnce()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      mounted.current = false
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [enabled, fetchOnce, intervalMs])

  return { data, initialLoading, refetch: fetchOnce }
}
