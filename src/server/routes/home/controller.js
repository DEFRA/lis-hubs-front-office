import {
  createSpokeAuthToken,
  getHubAuthSession
} from '@livestock/hubs-infra-access/auth'
import { getAccessibleModulesForHub } from '@livestock/hubs-infra-access'
import {
  hydrateModuleMetadata,
  MODULES,
  SPECIES
} from '@livestock/hubs-infra-registry'
import { getLoggerForConfig } from '@livestock/ui-services/logging'

import { config } from '#config/config.js'

const currentHubId = 'front-office'

export const homeController = {
  async handler(request, h) {
    const viewModel = buildHomeViewModel(request)

    if (viewModel.authenticatedUser) {
      const traceId = request.headers?.[config.get('tracing.header')]

      await Promise.all(
        viewModel.spokes.map(async (spoke) => {
          spoke.summary = await loadSpokeSummaryData(
            spoke,
            viewModel.authenticatedUser,
            traceId
          )
        })
      )

      return h.view('home/summary', {
        ...viewModel,
        ...buildDashboard(viewModel.spokes)
      })
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
    taxonomy: 'home'
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

async function loadSpokeSummaryData(spoke, authenticatedUser, traceId) {
  const logger = getLoggerForConfig(config)
  const spokeUrl = buildSummaryUrl(spoke)
  const headers = {
    Accept: 'application/json',
    Authorization: await createSpokeAuthToken(
      {
        taxonomyId: spoke.taxonomy.id,
        spokeId: spoke.id,
        user: authenticatedUser
      },
      getSpokeAuthConfig()
    )
  }

  if (traceId) {
    headers[config.get('tracing.header')] = traceId
  }
  const response = await fetch(spokeUrl, {
    method: 'GET',
    headers
  })

  if (!response.ok) {
    logger.error(
      `Failed to fetch spoke summary for ${spoke.id}: ${response.status} ${response.statusText}`
    )

    return {
      ok: false,
      value: 'Error fetching livestock summary, please try again later.'
    }
  }

  return {
    ok: true,
    data: await response.json()
  }
}

function buildSummaryUrl(spoke) {
  const spokePath = spoke.path.endsWith('/') ? spoke.path : `${spoke.path}/`

  return new URL(
    `${spokePath}summary-data`,
    config.get('auth.hubOrigin')
  ).toString()
}

function buildDashboard(spokes) {
  const farmsByName = new Map()
  const dashboardMessages = []

  for (const spoke of spokes) {
    if (!spoke.summary.ok) {
      dashboardMessages.push({
        title: `${spoke.species.label} summary unavailable`,
        text: spoke.summary.value
      })
      continue
    }

    const {
      actions = [],
      holdings = [],
      species = spoke.species
    } = spoke.summary.data

    addActions(dashboardMessages, actions, species)
    addHoldings(farmsByName, holdings, species)
  }

  return {
    dashboardMessages,
    farms: [...farmsByName.values()].map((farm) => ({
      name: farm.name,
      cphs: [...farm.cphsById.values()]
    }))
  }
}

function addActions(dashboardMessages, actions, species) {
  for (const action of actions) {
    dashboardMessages.push({
      title: action.title ?? `${species.label} action`,
      text: action.text,
      url: action.url,
      linkText: action.linkText ?? 'View action'
    })
  }
}

function addHoldings(farmsByName, holdings, species) {
  for (const holding of holdings) {
    const farm = getOrCreateFarm(farmsByName, holding.farmName)
    const cph = getOrCreateCph(farm, holding)

    cph.species.push({
      id: species.id,
      label: species.label,
      count: holding.count,
      url: holding.url ?? species.url
    })
  }
}

function getOrCreateFarm(farmsByName, farmName = 'Your farm') {
  const resolvedFarmName = farmName || 'Your farm'

  if (!farmsByName.has(resolvedFarmName)) {
    farmsByName.set(resolvedFarmName, {
      name: resolvedFarmName,
      cphsById: new Map()
    })
  }

  return farmsByName.get(resolvedFarmName)
}

function getOrCreateCph(farm, holding) {
  if (!farm.cphsById.has(holding.cph)) {
    farm.cphsById.set(holding.cph, {
      id: holding.cph,
      postcode: holding.postcode,
      species: []
    })
  }

  return farm.cphsById.get(holding.cph)
}
