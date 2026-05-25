// @mlabs/config — universal design tokens.
//
// Re-exports from the @mlabs/config/design subpath for callers that prefer
// the package root. The mobile Tailwind generator and check-contrast script
// import from this subpath; the eventual @mlabs/tailwind-config preset will
// also read from here.

export { design } from "./design"
export type { Design } from "./design"

export { brand } from "./brand"
export type { Brand } from "./brand"
