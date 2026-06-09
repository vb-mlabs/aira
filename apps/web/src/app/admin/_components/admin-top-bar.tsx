import { SignOutButton } from "../../(app)/_components/sign-out-button"

interface AdminTopBarProps {
  user: { name: string; email: string }
}

function getInitials(user: { name: string; email: string }): string {
  if (user.name?.trim()) {
    const parts = user.name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase()
  }
  return user.email[0].toUpperCase()
}

export function AdminTopBar({ user }: AdminTopBarProps) {
  const initials = getInitials(user)
  return (
    <header className="hidden h-14 items-center justify-end gap-4 border-b border-border bg-card/40 px-6 backdrop-blur-sm md:flex">
      <SignOutButton />
      <div
        aria-label={user.email}
        className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        title={user.email}
      >
        {initials}
      </div>
    </header>
  )
}
