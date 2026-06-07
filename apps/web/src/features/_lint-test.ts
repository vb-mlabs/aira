"use server"

export async function deleteMe(): Promise<void> {
  // Throwaway fixture verifying the lefthook check-no-server-actions hook.
  // This file should never be committed.
}
