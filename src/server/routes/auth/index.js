import {
  createHubAuthPlugin,
  createHubCookieOptions,
  GLOBAL_CPH_SCOPE,
  resolveAuthorization
} from '@defra/lis-hubs-infra-access/auth'

import { config } from '#config/config.js'
import { ishClient } from '#server/common/helpers/clients.js'
import {
  buildAuthorizationUrl,
  buildLogoutUrl,
  completeAuthorizationCodeGrant
} from '#server/common/helpers/auth/oidc.js'

// Only one role exists for front-office users at present, so it's granted
// unconditionally rather than derived from identity-service-helper's per-CPH
// roleName (e.g. "Keeper") - revisit once real role requirements exist.
const DEFAULT_ROLE = 'cphholder'

async function resolveAuthSession({ user }) {
  const profile = await ishClient.fetchUserProfile(user.sub)

  return resolveAuthorization({
    source: 'profile',
    holdingRoles: [{ role: DEFAULT_ROLE, cph: GLOBAL_CPH_SCOPE }],
    holdings: profile.directAssignments
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
