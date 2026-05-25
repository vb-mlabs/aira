// Splits a tagline string at the first case-sensitive occurrence of
// `highlight` and wraps that substring in primary-coloured text.
// If `highlight` is empty or doesn't appear in `text`, renders the
// tagline as plain text.

type TaglineProps = {
  text: string
  highlight?: string
}

export function Tagline({ text, highlight }: TaglineProps) {
  if (!highlight || !text.includes(highlight)) {
    return <>{text}</>
  }
  const idx = text.indexOf(highlight)
  const before = text.slice(0, idx)
  const after = text.slice(idx + highlight.length)
  return (
    <>
      {before}
      <span className="text-primary">{highlight}</span>
      {after}
    </>
  )
}
