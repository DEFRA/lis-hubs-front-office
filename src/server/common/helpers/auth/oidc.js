import { createOidcClient } from '@defra/lis-hubs-infra-access/auth'

import { config } from '#config/config.js'

const provider = {
  discoveryUrl: config.get('auth.oidc.discoveryUrl'),
  clientId: config.get('auth.oidc.clientId'),
  clientSecret: config.get('auth.oidc.clientSecret'),
  redirectPath: config.get('auth.oidc.redirectPath'),
  serviceId: config.get('auth.oidc.serviceId')
}

function mapUser(payload) {
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

export const {
  buildAuthorizationUrl,
  buildLogoutUrl,
  completeAuthorizationCodeGrant,
  getOidcMetadata
} = await createOidcClient({
  provider,
  hubOrigin: config.get('auth.hubOrigin'),
  mapUser
})
