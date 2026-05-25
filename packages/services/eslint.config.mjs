import library from "@aira/eslint-config/library"

// Cross-domain import boundary for @aira/services.
//
// Inside src/<domain>/* a file can import:
//   - other files in the same domain (./*, ./service, ./index)
//   - the public surface of another domain via @aira/services/<other>
//   - external packages (@aira/db, drizzle-orm, etc.)
//
// It CANNOT reach into another domain's internals:
//   ❌ import { x } from "../audit/service"
//   ❌ import { x } from "@aira/services/audit/service" (no such export)
//
// The rule is scoped to src/notifications, src/messages, etc. as those land.

const crossDomainBlocks = [
  // The patterns block reaching INTO another domain's internals
  // (`../<other>/<file>`). They still allow reaching the public surface via
  // `../<other>` (no trailing segment — resolves to the index.ts).
  //
  // Add a tuple per domain pair as new domains land.
  {
    files: ["src/notifications/**/*.ts"],
    forbidden: ["../audit/*", "../messages/*", "../users/*", "../admin/*"],
  },
  {
    files: ["src/messages/**/*.ts"],
    forbidden: ["../audit/*", "../notifications/*", "../users/*", "../admin/*"],
  },
  {
    files: ["src/users/**/*.ts"],
    forbidden: ["../audit/*", "../messages/*", "../notifications/*", "../admin/*"],
  },
  {
    files: ["src/admin/**/*.ts"],
    forbidden: ["../audit/*", "../messages/*", "../notifications/*", "../users/*"],
  },
]

export default [
  ...library,
  ...crossDomainBlocks.map(({ files, forbidden }) => ({
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: forbidden.map((p) => ({
            group: [p],
            message:
              "Cross-domain imports must go through @aira/services/<domain> (the public surface), not reach into another domain's files.",
          })),
        },
      ],
    },
  })),
]
