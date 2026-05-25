// JWT signing for the mobile app. Issuer must be stable across refreshes.
const ISSUER = "mlabs-mobile"

export function issuer() {
  return ISSUER
}
