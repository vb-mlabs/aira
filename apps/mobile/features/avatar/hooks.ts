import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pickAvatarFromLibrary, uploadAvatar } from "./api";

export function usePickAndUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const asset = await pickAvatarFromLibrary();
      if (!asset) return null;
      return uploadAvatar(asset);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}
