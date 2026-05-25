// Public surface of features/avatar.
//
// The avatar uploader is meant to drop into features/profile's account section
// (or any future "edit your identity" page). The server pipeline + route
// (src/app/api/avatar/route.ts) is the only authoritative path for mutation.

export { AvatarUploader } from "./components/avatar-uploader"
