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
        pageTitle: 'Your holding',
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

  const farms = [...farmsByName.values()].map((farm) => ({
    name: farm.name,
    cphs: [...farm.cphsById.values()]
  }))

  return {
    dashboardMessages,
    farms,
    activeHolding: buildActiveHolding(farms[0], dashboardMessages)
  }
}

function buildActiveHolding(farm, dashboardMessages) {
  const holding = farm?.cphs[0]

  if (!holding) {
    return null
  }

  const summaryRows = [
    {
      key: { text: 'CPH number' },
      value: {
        html: `<a class="govuk-link" href="/cattle/home?cph=${encodeURIComponent(holding.id)}">${holding.id}</a>`
      }
    },
    {
      key: { text: 'Holding name' },
      value: { text: holding.holdingName ?? farm.name }
    },
    { key: { text: 'Business name' }, value: { text: holding.businessName } },
    { key: { text: 'Address' }, lines: normaliseAddress(holding.address) },
    { key: { text: 'Holding type' }, value: { text: holding.holdingType } },
    {
      key: { text: 'Registered keeper' },
      value: { text: holding.registeredKeeper }
    },
    { key: { text: 'Herd mark' }, value: { text: holding.herdMark } }
  ]

  return {
    ...holding,
    summaryRows,
    name: holding.holdingName ?? farm.name,
    animalsUrl: holding.species.find((item) => item.url)?.url,
    errorsUrl: dashboardMessages.find((message) => message.url)?.url,
    animalsOnHolding: [],
    animalErrors: []
  }
}

function normaliseAddress(address) {
  if (Array.isArray(address)) {
    return address.filter(Boolean)
  }

  if (typeof address === 'string') {
    return address.split(/\r?\n/).filter(Boolean)
  }

  if (address && typeof address === 'object') {
    const lines = [
      address.line1,
      address.line2,
      address.town,
      address.county,
      address.postcode,
      address.country
    ].filter(Boolean)

    return lines.join("<br>")
  }

  return null
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
      holdingName: holding.holdingName ?? holding.farmName,
      businessName: holding.businessName,
      address: holding.address,
      holdingType: holding.holdingType,
      registeredKeeper: holding.registeredKeeper,
      herdMark: holding.herdMark,
      species: []
    })
  }

  const cph = farm.cphsById.get(holding.cph)

  for (const field of [
    'postcode',
    'holdingName',
    'businessName',
    'address',
    'holdingType',
    'registeredKeeper',
    'herdMark'
  ]) {
    const sourceField = field === 'holdingName' ? 'farmName' : field
    cph[field] ??= holding[field] ?? holding[sourceField]
  }

  return cph
}
