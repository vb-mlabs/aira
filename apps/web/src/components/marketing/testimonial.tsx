// The mstack flow — the four custom Claude Code skills that take a
// feature from idea to shipped code. Each step is a single slash command
// the dev runs in this repo.

const steps = [
  {
    cmd: "/mlabs-plan",
    title: "Plan",
    body:
      "Interactive consultation. Reads the codebase, asks about persona, wedge, and scope, then writes a structured plan to .mstack/plans/. No code edits.",
  },
  {
    cmd: "/mlabs-review",
    title: "Review",
    body:
      "Critiques the plan against MLabs conventions and the existing code. Raises blockers, locks decisions with you, and writes an approved task list to .mstack/reviews/.",
  },
  {
    cmd: "/mlabs-code",
    title: "Code",
    body:
      "The only mstack skill that edits code. Executes the approved review autonomously — one atomic commit per task — and pauses on ambiguity (migrations, brand changes, new deps).",
  },
  {
    cmd: "/mlabs-qa",
    title: "QA",
    body:
      "Scenario-driven testing. Drives Playwright through the flows you care about, captures screenshots + console errors, writes a bug report, then fixes + re-verifies after your approval.",
  },
]

export function Testimonial() {
  return (
    <section id="mstack" className="relative bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            How we work
          </div>
          <h2 className="text-balance text-4xl font-extrabold leading-[1.02] tracking-tighter md:text-5xl">
            The <span className="text-primary">mstack</span> flow: plan →
            review → code → qa
          </h2>
          <p className="mx-auto mt-5 text-[16px] leading-relaxed text-muted-foreground">
            Four custom Claude Code skills that live under{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">
              .claude/skills/
            </code>
            . Each one writes its outputs to{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">
              .mstack/
            </code>{" "}
            so the next step has a contract to consume.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.cmd}
              className="relative rounded-2xl border border-border bg-card p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {s.title}
                </div>
              </div>
              <div className="mb-3 font-mono text-[14px] font-bold text-primary">
                {s.cmd}
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-10 max-w-2xl text-center text-[13px] text-muted-foreground">
          There&apos;s also{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
            /mlabs-mockup
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
            /mlabs-design-review
          </code>
          , and{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
            /mlabs-auto
          </code>{" "}
          for design + autopilot workflows.
        </p>
      </div>
    </section>
  )
}
