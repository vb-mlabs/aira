import type { ReactNode } from "react"

// Light mode is the only supported theme. `colorScheme: "light"` on <html> in
// layout.tsx is sufficient — no theme provider is needed. The previous
// next-themes integration triggered a React 19 warning about <script> tags
// rendered inside the React tree.
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>
}
