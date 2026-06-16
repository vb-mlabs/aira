// User preferences domain — public surface. Cross-domain callers (other
// services, operations) import from here; reaching into ./service directly
// is blocked by the no-restricted-imports rule in tooling/eslint-config.

export { getPreferences, updatePreferences } from "./service"
