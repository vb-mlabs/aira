import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  signUpRequest,
  loginRequest,
  forgotPasswordRequest,
  resetPasswordRequest,
  verifyEmailRequest,
  resendVerifyRequest,
  signOutRequest,
  meRequest,
} from "./api";

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: meRequest,
    retry: false,
    staleTime: 60_000,
  });
}

export function useSignUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: signUpRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: loginRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPasswordRequest });
}

export function useResetPassword() {
  return useMutation({ mutationFn: resetPasswordRequest });
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: verifyEmailRequest });
}

export function useResendVerify() {
  return useMutation({ mutationFn: resendVerifyRequest });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: signOutRequest,
    onSettled: () => {
      // resetQueries (not clear) so active QueryObservers — notably the
      // useMe() in (app)/_layout.tsx that owns the auth gate — actually
      // get notified. queryClient.clear() destroys queries silently,
      // leaving stale observer snapshots and the gate stuck rendering
      // the tabs. onSettled (not onSuccess) covers the offline /
      // server-5xx branch: signOutRequest's finally already wiped local
      // tokens, so we still want the cache flushed regardless of the
      // network outcome.
      qc.resetQueries();
      // Belt-and-braces navigation. The (app) gate flipping via useMe →
      // error → Redirect IS the primary mechanism, but it's failed for
      // real users in the wild — notably on iOS where NSURLSession
      // caches the session cookie set at sign-in and continues sending
      // it after clearTokens(), keeping /get-session's response valid
      // and the gate happy. Imperative router.replace guarantees the
      // navigation regardless of any client-side cookie residue or race
      // in the reset → refetch → gate chain. Safe if the user is
      // already off (app); expo-router no-ops the navigation.
      router.replace("/(auth)/welcome");
    },
  });
}
