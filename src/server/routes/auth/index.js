import {
  createHubAuth,
  createHubCookieOptions
} from '@defra/lis-hubs-infra-access/authentication'
import { resolveAuthorization } from '@defra/lis-hubs-infra-access/authorization'

import { config } from '#config/config.js'
import { krdsClient } from '#server/common/helpers/clients.js'
import {
  toHoldingRoles,
  toHoldings
} from '#server/common/helpers/krds-mapping.js'
import {
  buildAuthorizationUrl,
  buildLogoutUrl,
  completeAuthorizationCodeGrant
} from '#server/common/helpers/auth/oidc.js'

// Roles come from krds's per-CPH associations, so a user's access to a
// holding is scoped to the CPHs krds says they hold a role on.

async function resolveAuthSession({ user }) {
  const account = await krdsClient.ensureAccount({
    sub: user.sub,
    email: user.email,
    given_name: user.firstName,
    family_name: user.lastName
  })

  return resolveAuthorization({
    source: 'krds',
    holdingRoles: toHoldingRoles(account.cphAssociations),
    holdings: toHoldings(account.cphAssociations)
  })
}

function getHubJwtCookieName() {
  return config.get('auth.hubJwt.cookieName')
}

function getCookieOptions() {
  return createHubCookieOptions({
    ttlSeconds: config.get('auth.hubJwt.ttlSeconds'),
    isSecure: config.get('session.cookie.secure')
  })
}

function getHubJwtConfig() {
  return {
    secret: config.get('auth.hubJwt.secret'),
    issuer: config.get('auth.hubJwt.issuer'),
    audience: config.get('auth.hubJwt.audience'),
    ttlSeconds: config.get('auth.hubJwt.ttlSeconds')
  }
}

export const auth = createHubAuth({
  getHubJwtCookieName,
  getCookieOptions,
  getHubJwtConfig,
  resolveAuthSession,
  buildAuthorizationUrl,
  completeAuthorizationCodeGrant,
  buildLogoutUrl,
  loginRoutes: [{ path: '/auth/login' }]
})
