// DataList — generic list renderer that REQUIRES empty/loading/error states.
// Devs writing a list cannot forget the states because the props demand them.
// Per Design Principle 1.

import type { ReactNode } from "react"
import { LoadingState } from "./loading-state"
import { ErrorState } from "./error-state"

interface DataListProps<T> {
  data: T[] | undefined
  loading: boolean
  error: Error | null
  /** Custom empty UI (recommended: <EmptyState ... />). */
  empty: ReactNode
  /** Renders each item; React handles keys via the key prop on the wrapper. */
  renderItem: (item: T, index: number) => ReactNode
  /** Optional key extractor; defaults to index (callers should override for stable lists). */
  keyExtractor?: (item: T, index: number) => string | number
  /** Loading skeleton row count; defaults to 5. */
  loadingRows?: number
  /** Optional retry passed to the ErrorState. */
  onRetry?: () => void | Promise<void>
}

export function DataList<T>({
  data,
  loading,
  error,
  empty,
  renderItem,
  keyExtractor = (_item, i) => i,
  loadingRows = 5,
  onRetry,
}: DataListProps<T>) {
  if (error) {
    return <ErrorState description={error.message} retry={onRetry} detail={error.stack} />
  }

  if (loading || data === undefined) {
    return <LoadingState variant="skeleton" rows={loadingRows} />
  }

  if (data.length === 0) {
    return <>{empty}</>
  }

  return (
    <ul className="space-y-2">
      {data.map((item, i) => (
        <li key={keyExtractor(item, i)}>{renderItem(item, i)}</li>
      ))}
    </ul>
  )
}
