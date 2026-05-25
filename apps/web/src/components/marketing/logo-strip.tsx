// The stack this template ships with. Surfaces the choices so a new dev
// doesn't have to grep package.json to know what they're getting.

const stack = [
  { name: "Next.js 15", className: "font-bold tracking-tight" },
  { name: "Expo 55", className: "font-bold tracking-tight" },
  { name: "Drizzle", className: "font-bold tracking-tight" },
  { name: "BetterAuth", className: "font-bold tracking-tight" },
  { name: "Stripe", className: "font-bold tracking-tight" },
  { name: "Postmark", className: "font-bold tracking-tight" },
] as const

export function LogoStrip() {
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="mb-6 text-center text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Built on
        </p>
        <div className="grid grid-cols-2 items-center gap-x-8 gap-y-5 text-foreground/70 sm:grid-cols-3 md:grid-cols-6">
          {stack.map((s) => (
            <div key={s.name} className={`text-center ${s.className}`}>
              {s.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
