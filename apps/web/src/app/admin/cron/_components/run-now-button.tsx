"use client"

import { useState, useTransition } from "react"
import { Play, Loader2 } from "lucide-react"
import { Button } from "@aira/ui-web/button"
import { apiClient } from "@/lib/api-client"

interface RunNowButtonProps {
  jobName: string
  onRun?: () => void
}

export function RunNowButton({ jobName, onRun }: RunNowButtonProps) {
  const [result, setResult] = useState<"ok" | "error" | null>(null)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      try {
        await apiClient.post(`/api/v1/admin/cron/${encodeURIComponent(jobName)}/run`, {
          job_name: jobName,
        })
        setResult("ok")
        onRun?.()
      } catch {
        setResult("error")
      }
    })
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={pending}
        className="gap-1.5"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Play className="size-3.5" aria-hidden />
        )}
        {pending ? "Running…" : "Run now"}
      </Button>
      {result === "ok" && (
        <span className="text-xs text-muted-foreground">Triggered.</span>
      )}
      {result === "error" && (
        <span className="text-xs text-destructive">Failed to trigger.</span>
      )}
    </span>
  )
}
