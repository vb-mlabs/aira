import path from "node:path"
import { fileURLToPath } from "node:url"

// Note: this is .mjs (not .ts). Next.js 16's TypeScript-config compiler
// emits a .compiled.js with CommonJS semantics when the config file uses
// `import.meta.url` / `__dirname` rebinds (which we need for
// outputFileTracingRoot). With `"type": "module"` in apps/web/package.json,
// the `.js` extension is treated as ESM by Node, and the CJS `exports = …`
// in the compiled output throws `ReferenceError: exports is not defined in
// ES module scope`. Authoring as `.mjs` sidesteps the entire pipeline —
// Next loads it directly as ESM without a transpile step. Typing is
// preserved via the JSDoc annotation below.

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Self-contained runtime in .next/standalone/ so the deploy image doesn't
  // need the full workspace node_modules at runtime. Without this, the
  // Replit Reserved VM image easily exceeds the 8 GiB cap (workspace
  // devDeps alone are ~2 GB once Playwright, vitest, drizzle-kit, etc. land).
  // See docs/template/TEMPLATE.md §11 + recommendations #22–#24.
  output: "standalone",

  // pnpm workspace: scope the file tracer at the monorepo root so it
  // follows pnpm symlinks into packages/*. Without this, Next traces only
  // apps/web/ and ships a runtime that 500s on first request that imports
  // @aira/db (or any other workspace dep) with `Cannot find module`.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // Sharp is a native module — Next's Turbopack bundler doesn't automatically
  // include the sibling `@img/sharp-libvips-*/lib/libvips-cpp.so.*` shared
  // object at runtime, so the standalone build 500s with
  // `ERR_DLOPEN_FAILED: libvips-cpp.so.<v>: cannot open shared object file`
  // on any code path that imports sharp (avatar upload, business logo,
  // payment evidence pipelines). Two-part fix:
  //   1. Mark sharp as external so it's `require()`d from node_modules
  //      rather than bundled into a Turbopack chunk.
  //   2. Explicitly trace the native platform packages into standalone —
  //      the tracer skips the 18MB .so file by default.
  // Sharp's platform detection at runtime picks the right one, so tracing
  // both glibc + musl variants keeps the deploy portable across images.
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "**/*": [
      "../../node_modules/@img/sharp-linux-x64/**/*",
      "../../node_modules/@img/sharp-linuxmusl-x64/**/*",
      "../../node_modules/@img/sharp-libvips-linux-x64/**/*",
      "../../node_modules/@img/sharp-libvips-linuxmusl-x64/**/*",
    ],
  },

  // Allow dev-time cross-origin requests from local + Replit preview hosts.
  // Next.js 16 blocks cross-origin dev requests by default; without these
  // the *.replit.dev preview iframe shows CORS warnings on every HMR ping.
  // Replit domains are two levels deep (e.g. <id>.kirk.replit.dev) so we
  // include the exact REPLIT_DEV_DOMAIN alongside broad wildcard patterns.
  allowedDevOrigins: [
    "127.0.0.1",
    "*.replit.dev",
    "*.repl.co",
    "*.worf.replit.dev",
    "*.kirk.replit.dev",
    // eslint-disable-next-line no-restricted-syntax
    ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : []),
  ],

  // Workspace packages ship TS source from packages/* — Next needs to run
  // them through its compiler instead of trying to load them as pre-built JS.
  transpilePackages: [
    "@aira/api",
    "@aira/auth",
    "@aira/config",
    "@aira/db",
    "@aira/email",
    "@aira/services",
    "@aira/ui-web",
    "@aira/validators",
  ],

  // Universal-link manifests under /public/.well-known/. The default
  // static-file Content-Type for the extensionless apple-app-site-association
  // file is application/octet-stream; Apple's swcd is currently lenient but
  // the contract wants application/json. Pinning via a headers() rule keeps
  // the file served from /public (smallest diff) while overriding the MIME
  // for both AASA and assetlinks.json. 5-min cache matches Apple/Google's
  // documented re-fetch cadence (verifiers re-pull on their own schedule).
  async headers() {
    return [
      {
        source: "/.well-known/:path*",
        headers: [
          { key: "content-type", value: "application/json" },
          {
            key: "cache-control",
            value: "public, max-age=300, s-maxage=300",
          },
        ],
      },
    ]
  },

  // Apex-only canonical host. The `www.` subdomain currently resolves to a
  // third-party parking host (airabynisarga-com.l.ink); this rule ships as
  // dormant code that activates the moment DNS for www.airabynisarga.com
  // points at our origin. Match shape mirrors Next's documented host-based
  // redirect — :path* preserves the requested route, permanent=true emits 301
  // so browsers + Apple/Google verifiers cache the canonical host.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          { type: "host", value: "www.airabynisarga.com" },
        ],
        destination: "https://airabynisarga.com/:path*",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
