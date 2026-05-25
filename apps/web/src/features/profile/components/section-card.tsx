import { cn } from "@mlabs/ui-web/utils"

interface SectionCardProps {
  title: string
  description?: string
  tone?: "default" | "danger"
  children: React.ReactNode
}

export function SectionCard({
  title,
  description,
  tone = "default",
  children,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-card",
        tone === "danger" ? "border-destructive/40" : "border-border",
      )}
    >
      <header
        className={cn(
          "border-b px-6 py-4",
          tone === "danger" ? "border-destructive/40" : "border-border",
        )}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}
