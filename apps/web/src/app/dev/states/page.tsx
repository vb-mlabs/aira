// Storybook-style demo for the state primitives. Lives under /dev/ so it
// doesn't pollute the marketing or app routes — and so the pre-ship checklist
// reminds us to delete the whole src/app/dev/ tree before v1 ships.
//
// Hit it locally at: http://localhost:3000/dev/states

"use client"

import { Inbox, Mail, Search } from "lucide-react"
import { useState } from "react"
import { DataList, EmptyState, ErrorState, LoadingState } from "@/lib/ui"

export default function StatesDemoPage() {
  const [demoData, setDemoData] = useState<string[] | undefined>(undefined)
  const [demoError, setDemoError] = useState<Error | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)

  async function loadOk() {
    setDemoError(null)
    setDemoLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setDemoData(["Alice", "Bob", "Carol"])
    setDemoLoading(false)
  }
  async function loadEmpty() {
    setDemoError(null)
    setDemoLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setDemoData([])
    setDemoLoading(false)
  }
  async function loadError() {
    setDemoLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    setDemoData(undefined)
    setDemoError(new Error("Could not reach the server. Try again."))
    setDemoLoading(false)
  }

  return (
    <main className="mx-auto max-w-4xl space-y-12 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">State primitives demo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal route. Delete <code className="text-foreground">src/app/dev/</code>{" "}
          before v1 ship.
        </p>
      </header>

      <Section title="EmptyState">
        <EmptyState
          icon={Inbox}
          title="No messages yet"
          description="When someone sends you a message, it'll appear here."
          action={{ label: "Find people", href: "/discover" }}
          secondaryAction={{ label: "Learn more", href: "/help/messages" }}
        />
      </Section>

      <Section title="LoadingState — skeleton (default)">
        <LoadingState rows={4} />
      </Section>

      <Section title="LoadingState — spinner">
        <LoadingState variant="spinner" />
      </Section>

      <Section title="LoadingState — shimmer">
        <LoadingState variant="shimmer" />
      </Section>

      <Section title="ErrorState (with retry + collapsible detail)">
        <ErrorState
          title="Couldn't load messages"
          description="Something went wrong. Try again?"
          retry={async () => {
            await new Promise((r) => setTimeout(r, 500))
          }}
          detail="Error: connect ECONNREFUSED 127.0.0.1:5432\n  at TCPConnectWrap.afterConnect [as oncomplete]"
        />
      </Section>

      <Section title="DataList (interactive)">
        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={loadOk}
            className="rounded-md border border-border bg-card px-3 py-1.5 hover:bg-muted"
          >
            Load 3 items
          </button>
          <button
            onClick={loadEmpty}
            className="rounded-md border border-border bg-card px-3 py-1.5 hover:bg-muted"
          >
            Load empty
          </button>
          <button
            onClick={loadError}
            className="rounded-md border border-border bg-card px-3 py-1.5 hover:bg-muted"
          >
            Trigger error
          </button>
        </div>
        <DataList
          data={demoData}
          loading={demoLoading}
          error={demoError}
          empty={
            <EmptyState
              icon={Search}
              title="No matches"
              description="Try adjusting your filters."
            />
          }
          keyExtractor={(item) => item}
          renderItem={(name) => (
            <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-sm">{name}</span>
            </div>
          )}
          onRetry={loadOk}
        />
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}
