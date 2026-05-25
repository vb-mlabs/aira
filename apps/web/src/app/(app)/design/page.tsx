// Live design-system style guide. Reads exclusively from @mlabs/config
// so the page drifts the moment a token changes. Auth-gated by the
// (app) route group (requireUser() in ../layout.tsx).
//
// No nav link — devs find this route via DESIGN.md. Intentional: this
// is a maintenance surface, not a marketing surface.

import { brand, design } from "@mlabs/config"
import { Button } from "@mlabs/ui-web/button"
import { Input } from "@mlabs/ui-web/input"
import { Label } from "@mlabs/ui-web/label"

export const metadata = {
  title: "Design system",
  description: "Live style guide for the template.",
}

export default function DesignSystemPage() {
  return (
    <div className="space-y-16 py-4">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-primary">
          Live · reads from @mlabs/config
        </div>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
          Design system
        </h1>
        <p className="mt-3 text-muted-foreground">
          Tokens, components, and motion for {brand.name}. Every value on
          this page comes from{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">
            packages/config/src/design.ts
          </code>
          .
        </p>
      </header>

      <Section title="Brand">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6">
          <span className="inline-block size-3 rounded-full bg-primary" />
          <div>
            <div className="text-xl font-extrabold tracking-tight">
              {brand.name}
            </div>
            <div className="text-sm text-muted-foreground">{brand.tagline}</div>
          </div>
        </div>
      </Section>

      <Section title="Palette — light">
        <PaletteGrid colors={design.colors.light} />
      </Section>

      <Section title="Palette — dark (preserved for Phase 2)">
        <PaletteGrid colors={design.colors.dark} />
      </Section>

      <Section title="Type scale">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          {Object.entries(design.type).map(([name, t]) => (
            <div
              key={name}
              className="flex items-baseline gap-6 border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              <div className="w-12 font-mono text-[12px] text-muted-foreground">
                {name}
              </div>
              <div
                className="flex-1 truncate"
                style={{ fontSize: t.size, lineHeight: t.line }}
              >
                The quick brown fox
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {t.size} / {t.line}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radii">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-6 sm:grid-cols-3 md:grid-cols-6">
          {Object.entries(design.radius).map(([name, value]) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div
                className="h-16 w-16 bg-primary/15 ring-1 ring-primary/30"
                style={{ borderRadius: value }}
              />
              <div className="font-mono text-[11px] text-muted-foreground">
                {name}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Motion">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
              Durations
            </div>
            <ul className="space-y-2 font-mono text-[13px]">
              {Object.entries(design.motion.durations).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
              Easings
            </div>
            <ul className="space-y-2 font-mono text-[12px]">
              {Object.entries(design.motion.easings).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="truncate">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-6">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-6">
          <Button size="xs">xs</Button>
          <Button size="sm">sm</Button>
          <Button>default</Button>
          <Button size="lg">lg</Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ds-default">Default</Label>
            <Input id="ds-default" placeholder="Type here" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-filled">Filled</Label>
            <Input id="ds-filled" defaultValue="founder@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-disabled">Disabled</Label>
            <Input id="ds-disabled" disabled defaultValue="locked@example.com" />
          </div>
        </div>
      </Section>

      <Section title="Cards & surfaces">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Surface label="bg-background" className="bg-background" />
          <Surface label="bg-card" className="bg-card" />
          <Surface label="bg-muted" className="bg-muted" />
        </div>
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function PaletteGrid({ colors }: { colors: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {Object.entries(colors).map(([name, value]) => (
        <Swatch key={name} name={name} value={value} />
      ))}
    </div>
  )
}

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className="h-16 w-full border-b border-border"
        style={{ background: value }}
        aria-hidden
      />
      <div className="space-y-1 p-3">
        <div className="font-mono text-[12px] font-medium">{name}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">
          {value}
        </div>
      </div>
    </div>
  )
}

function Surface({ label, className }: { label: string; className: string }) {
  return (
    <div
      className={`flex h-32 items-end rounded-xl border border-border p-3 font-mono text-[11px] text-muted-foreground ${className}`}
    >
      {label}
    </div>
  )
}
