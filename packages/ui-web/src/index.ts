// @mlabs/ui-web — shadcn primitives + cn() utility.
//
// Primitives are also reachable via subpath imports (./button, ./field, etc.)
// so consumers can tree-shake on a per-component basis. The barrel re-exports
// everything for callers that prefer a single import line.

export { Button, buttonVariants } from "./components/button"
export {
  FieldSet,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldDescription,
  FieldError,
  Field,
  FieldLabel,
  FieldTitle,
  FieldContent,
} from "./components/field"
export { Input } from "./components/input"
export { Label } from "./components/label"
export { Separator } from "./components/separator"
export { Skeleton } from "./components/skeleton"
export { Toaster } from "./components/sonner"
export { cn } from "./lib/utils"
