// Tiny initials helper for the post-author avatar — mirrors web's
// initialsOf used in post-card.tsx. "Jane Smith" → "JS", "Cher" → "C".

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}
