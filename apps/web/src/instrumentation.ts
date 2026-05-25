// Next.js 16 instrumentation hook — fires once per server start, before
// the first request. The canonical place to boot long-lived work like a
// pg-boss / BullMQ worker pool, a background scheduler, or telemetry SDK
// initialization.
//
// The template ships this empty. Forks that add background work:
//
//   1. Put the worker code in a server-only package (e.g.
//      packages/services/src/<domain>/worker.ts).
//   2. Dynamic-import it from inside register() so it's pulled in only by
//      the nodejs runtime, not the edge bundle.
//   3. Guard on NEXT_RUNTIME (skip edge) AND NEXT_PHASE (skip
//      build-time — Next type-checks instrumentation during the build but
//      we don't want to open DB connections or schedule jobs there).
//
// Example (sketch):
//
//   export async function register() {
//     if (process.env.NEXT_RUNTIME !== "nodejs") return
//     if (process.env.NEXT_PHASE === "phase-production-build") return
//     const { startWorker } = await import("@mlabs/services/<domain>")
//     await startWorker()
//   }
//
// The worker module should be idempotent (singleton guard inside) so HMR
// in dev doesn't re-fire. A SIGTERM handler in the worker should call a
// graceful stop.
//
// See docs/decisions/0008-codebase-conventions.md (lands in T18).

export async function register() {
  // No-op in the template — forks add their boot code here.
}
