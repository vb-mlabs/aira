import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Updates from "expo-updates";
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
  return useMutation({
    mutationFn: signOutRequest,
    onSettled: async () => {
      // Nuclear-option sign-out: restart the JS runtime after tokens are
      // wiped. Previous attempts (qc.resetQueries → useMe refetch → gate
      // <Redirect>, then + imperative router.replace) each looked correct
      // on paper but shipped 3 rounds of "sign out doesn't work" reports
      // because *any* of {cookie residue, cache-notify race, gate-render
      // timing, modal-blocking-navigation, expo-router group-path
      // resolution} could defeat the whole chain silently. Updates.reload
      // ends the entire class of bugs: JS runtime restarts, app/index.tsx
      // cold-boot runs, meRequest hits 401 (tokens gone), user lands at
      // (auth)/welcome via the same code path any first-open uses.
      //
      // reloadAsync is a no-op in the classic Expo Go client — safe there
      // (dev QA doesn't test sign-out end-to-end anyway). onSettled runs
      // regardless of network outcome so users whose server-side sign-out
      // request errored still get the local restart + welcome screen.
      try {
        await Updates.reloadAsync();
      } catch {
        // Extremely rare — Updates unavailable (e.g. bare-workflow, or
        // reload disabled in eas.json). If we can't reload, the tokens
        // are already cleared by signOutRequest's finally, so the app
        // is in an incoherent state either way. Swallow to keep the
        // mutation's promise resolving cleanly.
      }
    },
  });
}
