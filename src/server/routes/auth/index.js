import {
  createHubAuthPlugin,
  createHubCookieOptions,
  createProfileService,
  resolveAuthorization
} from '@livestock/hubs-infra-access/auth'

import { config } from '#config/config.js'
import {
  buildAuthorizationUrl,
  buildLogoutUrl,
  completeAuthorizationCodeGrant
} from '#server/common/helpers/auth/oidc.js'

const fetchUserProfile = createProfileService({ config })

async function resolveAuthSession({ user, accessToken }) {
  const profile = await fetchUserProfile(user, accessToken)

  return resolveAuthorization({
    source: 'profile',
    sourceRoles: profile.roles,
    roleAssignments: profile.roleAssignments,
    holdings: profile.holdings
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
