// Schema barrel — re-exports the wire-format Zod schemas + types from
// @mlabs/validators. App code can `import { LoginInput } from "@/lib/schemas"`
// without having to know about the package layout.

export * from "@mlabs/validators";
