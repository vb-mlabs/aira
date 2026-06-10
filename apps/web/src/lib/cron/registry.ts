// Cron job registry — populated by startCrons() in this module.
// Route handlers call startCrons.getRunner(jobName) to trigger a named job on demand.
// Full implementation in T9; this stub satisfies T7/T8 imports.

type RunnerFn = (runId: string) => Promise<void>

const runners = new Map<string, RunnerFn>()

export function registerRunner(jobName: string, fn: RunnerFn): void {
  runners.set(jobName, fn)
}

export function getRunner(jobName: string): RunnerFn | undefined {
  return runners.get(jobName)
}

export function getRegisteredJobs(): string[] {
  return Array.from(runners.keys())
}

export async function startCrons(): Promise<void> {
  // Implemented in T9.
}
// Attach getRunner as a property so callers can do startCrons.getRunner(...)
startCrons.getRunner = getRunner
