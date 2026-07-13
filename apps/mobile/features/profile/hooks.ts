import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateProfile,
  changePassword,
  requestEmailChange,
  deleteAccount,
} from "./api";

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword });
}

export function useRequestEmailChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestEmailChange,
    // Only invalidate on changed:true — the no-op branch left the server
    // state untouched, so refetching /me would be wasted work.
    onSuccess: (data) => {
      if (data.changed) {
        qc.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    // Same shape as useSignOut in features/auth/hooks.ts — resetQueries
    // (not clear) so the useMe() observer in (app)/_layout.tsx is notified
    // and the gate re-renders to redirect. onSettled (not onSuccess) so
    // the flip still happens on network failure — deleteAccount's local
    // clearTokens() runs in a finally block so tokens are gone regardless.
    onSettled: () => qc.resetQueries(),
  });
}
