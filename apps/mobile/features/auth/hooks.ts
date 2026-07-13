import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    // resetQueries (not clear) so active QueryObservers — notably the
    // useMe() in (app)/_layout.tsx that owns the auth gate — actually get
    // notified. queryClient.clear() destroys queries silently, leaving
    // stale observer snapshots and the gate stuck rendering the tabs.
    // onSettled (not onSuccess) covers the offline / server-5xx branch:
    // signOutRequest's finally already wiped local tokens, so we still
    // want the gate to flip regardless of the network outcome.
    onSettled: () => qc.resetQueries(),
  });
}
