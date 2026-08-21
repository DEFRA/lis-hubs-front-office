import { config } from '#config/config.js'

/**
 * Map provider-specific OIDC claims to the hub user shape.
 *
 * @param {object} payload verified ID token claims
 * @returns {object} hub user
 */
export function mapUser(payload) {
  return {
    sub: payload.sub,
    email: payload.email ?? '',
    firstName: payload.firstName ?? '',
    lastName: payload.lastName ?? '',
    serviceId: payload.serviceId ?? config.get('auth.oidc.serviceId'),
    roles: Array.isArray(payload.roles) ? payload.roles : [],
    loa: payload.loa ?? '',
    amr: Array.isArray(payload.amr) ? payload.amr : []
  }
}
