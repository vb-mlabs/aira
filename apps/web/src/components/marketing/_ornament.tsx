// Brass-gold ✦ + double-hairline ornament used above editorial section
// headers (About, Categories). Keep this minimal — if the glyph or hairline
// length ever changes, this is the single source of truth.

export function Ornament() {
  return (
    <div className="mb-8 flex items-center justify-center gap-4">
      <hr className="h-px w-12 border-0 bg-brand-gold/50" />
      <span className="font-display text-2xl text-brand-gold">✦</span>
      <hr className="h-px w-12 border-0 bg-brand-gold/50" />
    </div>
  )
}
