export function CtaBand() {
  return (
    <section id="start" className="relative">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-foreground p-12 text-center text-background md:p-16">
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(60% 80% at 50% 0%, color-mix(in oklch, var(--color-primary) 30%, transparent), transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="text-balance text-4xl font-extrabold leading-[1.02] tracking-tighter md:text-6xl">
              Adding a feature?
              <br />
              Start with{" "}
              <span className="font-mono text-primary">/mlabs-plan</span>.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[16px] text-background/70">
              The plan lands in{" "}
              <code className="rounded bg-background/10 px-1.5 py-0.5 font-mono text-[14px] text-background">
                .mstack/plans/
              </code>
              . Pass it through{" "}
              <code className="rounded bg-background/10 px-1.5 py-0.5 font-mono text-[14px] text-background">
                /mlabs-review
              </code>{" "}
              and{" "}
              <code className="rounded bg-background/10 px-1.5 py-0.5 font-mono text-[14px] text-background">
                /mlabs-code
              </code>{" "}
              to ship. End with{" "}
              <code className="rounded bg-background/10 px-1.5 py-0.5 font-mono text-[14px] text-background">
                /mlabs-qa
              </code>
              .
            </p>
            <div className="mx-auto mt-9 max-w-md rounded-xl border border-background/20 bg-background/5 p-4 text-left">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-background/50">
                Run in this repo
              </div>
              <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-background">
                <code>{`/mlabs-plan
/mlabs-review
/mlabs-code
/mlabs-qa`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
