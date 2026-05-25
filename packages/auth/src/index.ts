// @mlabs/auth — Better Auth + JWT helpers as workspace factories.
//
// Subpath imports:
//   - @mlabs/auth/server                 — createAuth({ db, secret, ... }) (server-only)
//   - @mlabs/auth/jwt                    — createJwt({ secret }) (server-only)
//   - @mlabs/auth/hooks/admin-bootstrap  — first-signup admin promotion
//   - @mlabs/auth/hooks/ban-check        — pre-session ban gate
//
// The barrel re-exports the universal types so callers can destructure
// AccessTokenPayload etc. without pulling in server-only modules.

export type {
  AccessTokenPayload,
  CreateJwtOptions,
  JwtHelpers,
} from "./jwt"
export type {
  CreateAuthOptions,
  AuthEmailSender,
  AuthLogger,
  Auth,
} from "./server"
