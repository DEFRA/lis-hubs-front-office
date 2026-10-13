import {
  createHubAuth,
  createHubCookieOptions
} from '@defra/lis-hubs-infra-access/authentication'
import { resolveAuthorization } from '@defra/lis-hubs-infra-access/authorization'

import { logger } from '@defra/lis-hubs-infra-core'

import { config } from '#config/config.js'
import { isAllowListed } from '#server/common/helpers/auth/allow-list.js'
import { cattleHomeBe4FeClient } from '#server/common/helpers/cattle-home-be4fe-client.js'
import {
  toHoldingRolesFromUserCphs,
  toHoldingsFromUserCphs
} from '#server/common/helpers/cattle-home-be4fe-mapping.js'
import {
  buildAuthorizationUrl,
  buildLogoutUrl,
  completeAuthorizationCodeGrant
} from '#server/common/helpers/auth/oidc.js'

export const ACCESS_DENIED_PATH = '/auth/access-denied'

// Roles come from the BE4FE's per-user CPHs, so a user's access to a
// holding is scoped to the CPHs it says they hold a role on.

async function resolveAuthSession({ user }) {
  // Checked before the BE4FE so no account is created for a refused user. The
  // log line carries user_email_hash from the OIDC grant, not the email.
  if (!isAllowListed(user.email)) {
    logger.info('Front-office login refused: user is not on the allow-list')

    return { denied: true }
  }

  const userDetails = await cattleHomeBe4FeClient.createUser({
    sub: user.sub,
    email: user.email,
    given_name: user.firstName,
    family_name: user.lastName
  })

  return resolveAuthorization({
    source: 'krds',
    holdingRoles: toHoldingRolesFromUserCphs(userDetails.cphs),
    holdings: toHoldingsFromUserCphs(userDetails.cphs)
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
  hubId: 'front-office',
  getHubJwtCookieName,
  getCookieOptions,
  getHubJwtConfig,
  resolveAuthSession,
  buildAuthorizationUrl,
  completeAuthorizationCodeGrant,
  buildLogoutUrl,
  loginRoutes: [{ path: '/auth/login' }],
  notAuthorisedPath: ACCESS_DENIED_PATH
})
