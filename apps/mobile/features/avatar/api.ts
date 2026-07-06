import { apiRequest, ApiError } from "../../lib/api/client";
import * as ImagePicker from "expo-image-picker";

const MAX_BYTES = 5 * 1024 * 1024;

export async function pickAvatarFromLibrary(): Promise<
  ImagePicker.ImagePickerAsset | null
> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new ApiError({
      status: 403,
      code: "permission_denied",
      message: "Photo library permission denied. Enable it in Settings.",
    });
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    // No crop step — Avatar renders the image inside a circular frame,
    // so a portrait source center-crops visually. Cleaner UX than making
    // the user re-frame after they've already picked. If off-center
    // portraits become a QA issue, add a server-side smart-crop pass.
    allowsEditing: false,
    quality: 0.85,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if (asset.fileSize !== undefined && asset.fileSize > MAX_BYTES) {
    throw new ApiError({
      status: 413,
      code: "file_too_large",
      message: "That image is larger than 5MB. Pick a smaller one.",
    });
  }
  return asset;
}

export async function uploadAvatar(
  asset: ImagePicker.ImagePickerAsset
): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  const name = asset.fileName ?? "avatar.jpg";
  const type = asset.mimeType ?? "image/jpeg";
  // RN FormData typings accept `{ uri, name, type }` even though the DOM spec
  // forbids it; cast through `unknown`.
  form.append("file", {
    uri: asset.uri,
    name,
    type,
  } as unknown as Blob);
  const res = await apiRequest<{ avatarUrl: string }>("/api/v1/avatar", {
    method: "POST",
    body: form,
  });
  if (!res.data) {
    throw new ApiError({
      status: res.status,
      code: "empty_response",
      message: "No avatar URL returned",
    });
  }
  return res.data;
}
