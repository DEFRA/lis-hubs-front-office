import { getHubAuthSession } from '@livestock/hub-core/auth/session'
import { getAccessibleModulesForHub } from '@livestock/ui-services/module-access'
import { hydrateModuleMetadata, MODULES, SPECIES } from '@livestock/hub-registry'
import { createSpokeAuthToken } from '@livestock/ui-services/auth'
import { getLoggerForConfig } from '@livestock/ui-services/logging'

import { config } from '#config/config.js'

const currentHubId = 'front-office'

export const homeController = {
  async handler(request, h) {
    const viewModel = buildHomeViewModel(request)

    if (viewModel.authenticatedUser) {
      for (const spoke of viewModel.spokes) {
        spoke.status = await loadSpokeStatus(spoke, viewModel.authenticatedUser)
      }

      return h.view('home/status', viewModel)
    }

    return h.view('home/welcome', {
      ...viewModel,
      pageTitle: 'Welcome',
      heading: 'Livestock Information',
      supportedSpecies: SPECIES,
      loginUrl: '/auth/login?returnUrl=/'
    })
  }
}

function buildHomeViewModel(request) {
  const authenticatedUser = getHubAuthSession(request)
  const spokes = getAccessibleModulesForHub({
    hubId: currentHubId,
    user: authenticatedUser,
    modules: MODULES,
    taxonomy: 'status'
  }).map((spoke) => {
    const hydratedSpoke = hydrateModuleMetadata(spoke)

    return {
      ...hydratedSpoke,
      taxonomy: {
        id: spoke.taxonomy,
        label: hydratedSpoke.taxonomyLabel
      },
      species: {
        id: spoke.species,
        label: hydratedSpoke.speciesLabel
      },
      url: spoke.spokeUrl ?? spoke.path
    }
  })

  return {
    authenticatedUser,
    loginUrl: '/auth/login?returnUrl=/',
    logoutUrl: '/auth/logout',
    spokes,
    supportedSpokes: MODULES
  }
}

function getSpokeAuthConfig() {
  return {
    secret: config.get('auth.hubJwt.secret'),
    issuer: config.get('auth.hubJwt.issuer'),
    audience: config.get('auth.hubJwt.audience'),
    ttlSeconds: config.get('auth.hubJwt.ttlSeconds')
  }
}

async function loadSpokeStatus(spoke, authenticatedUser) {
  const logger = getLoggerForConfig(config)
  const spokeUrl = buildStatusUrl(spoke)
  const headers = {
    Authorization: await createSpokeAuthToken(
      {
        taxonomyId: spoke.taxonomy.id,
        spokeId: spoke.id,
        user: authenticatedUser
      },
      getSpokeAuthConfig()
    )
  }
  const response = await fetch(spokeUrl, {
    method: 'GET',
    headers
  })

  if (!response.ok) {
    logger.error(
      `Failed to fetch spoke status for ${spoke.id}: ${response.status} ${response.statusText}`
    )

    return {
      ok: false,
      value: 'Error fetching spoke status, please try again later.'
    }
  }

  return {
    ok: true,
    value: await response.text()
  }
}

function buildStatusUrl(spoke) {
  const spokePath = spoke.path.endsWith('/') ? spoke.path : `${spoke.path}/`

  return new URL(spokePath, config.get('auth.hubOrigin')).toString()
}
