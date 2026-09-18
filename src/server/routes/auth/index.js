import {
  createHubAuthPlugin,
  createHubCookieOptions,
  GLOBAL_CPH_SCOPE,
  resolveAuthorization
} from '@defra/lis-hubs-infra-access/auth'

import { config } from '#config/config.js'
import { krdsClient } from '#server/common/helpers/clients.js'
import { toHoldings } from '#server/common/helpers/krds-mapping.js'
import {
  buildAuthorizationUrl,
  buildLogoutUrl,
  completeAuthorizationCodeGrant
} from '#server/common/helpers/auth/oidc.js'

// Only one role exists for front-office users at present, so it's granted
// unconditionally rather than derived from krds's per-CPH role (e.g.
// "Keeper") - revisit once real role requirements exist.
const DEFAULT_ROLE = 'cphholder'

async function resolveAuthSession({ user }) {
  const account = await krdsClient.ensureAccount({
    sub: user.sub,
    email: user.email,
    given_name: user.firstName,
    family_name: user.lastName
  })

  return resolveAuthorization({
    source: 'profile',
    holdingRoles: [{ role: DEFAULT_ROLE, cph: GLOBAL_CPH_SCOPE }],
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

export const auth = createHubAuthPlugin({
  getHubJwtCookieName,
  getCookieOptions,
  getHubJwtConfig,
  resolveAuthSession,
  buildAuthorizationUrl,
  completeAuthorizationCodeGrant,
  buildLogoutUrl,
  loginRoutes: [{ path: '/auth/login' }]
})
