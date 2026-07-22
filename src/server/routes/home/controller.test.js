import { beforeEach, describe, expect, test, vi } from 'vitest'

const {
  createSpokeAuthToken,
  getAccessibleModulesForHub,
  getHubAuthSession,
  logger,
  moduleDefinitions
} = vi.hoisted(() => ({
  createSpokeAuthToken: vi.fn(),
  getAccessibleModulesForHub: vi.fn(),
  getHubAuthSession: vi.fn(),
  logger: {
    error: vi.fn()
  },
  moduleDefinitions: [
    {
      id: 'cattle-home',
      label: 'Home for Cattle',
      path: '/cattle/home',
      port: 3221,
      taxonomy: 'home',
      species: 'ctt',
      hubs: ['front-office', 'back-office']
    },
    {
      id: 'sheep-home',
      label: 'Home for Sheep',
      path: '/sheep/home',
      port: 3224,
      taxonomy: 'home',
      species: 'shp',
      hubs: ['front-office', 'back-office']
    }
  ]
}))

const configValues = {
  'auth.hubJwt.secret': 'front-office-hub-secret-please-change-1234567890',
  'auth.hubJwt.issuer': 'http://localhost:3101',
  'auth.hubJwt.audience': 'livestock-spokes',
  'auth.hubJwt.ttlSeconds': 14400,
  'auth.hubOrigin': 'http://localhost:3101',
  'tracing.header': 'x-cdp-request-id'
}

vi.mock('@livestock/hubs-infra-access', () => ({
  getAccessibleModulesForHub
}))

vi.mock('@livestock/hubs-infra-registry', () => ({
  MODULES: moduleDefinitions,
  SPECIES: [
    {
      code: 'ctt',
      label: 'Cattle'
    },
    {
      code: 'shp',
      label: 'Sheep'
    }
  ],
  hydrateModuleMetadata: vi.fn((module) => ({
    ...module,
    taxonomyLabel: 'Home',
    speciesLabel: module.species === 'ctt' ? 'Cattle' : 'Sheep'
  }))
}))

vi.mock('@livestock/hubs-infra-access/auth', () => ({
  createSpokeAuthToken,
  getHubAuthSession
}))

vi.mock('@livestock/ui-services/logging', () => ({
  getLoggerForConfig: vi.fn(() => logger)
}))

vi.mock('#config/config.js', () => ({
  config: {
    get: vi.fn((path) => configValues[path])
  }
}))

import { homeController } from './controller.js'

describe('#frontOfficeHomeController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  test('Should render the welcome view for unauthenticated users', async () => {
    const view = vi.fn(() => 'rendered')

    getHubAuthSession.mockReturnValue(null)
    getAccessibleModulesForHub.mockReturnValue([])

    const response = await homeController.handler(
      {},
      {
        view
      }
    )

    expect(response).toBe('rendered')
    expect(view).toHaveBeenCalledWith(
      'home/welcome',
      expect.objectContaining({
        pageTitle: 'Welcome',
        heading: 'Livestock Information',
        loginUrl: '/auth/login?returnUrl=/',
        supportedSpokes: moduleDefinitions
      })
    )
  })

  test('Should render livestock home summaries for authenticated users', async () => {
    const authenticatedUser = {
      sub: 'user-1',
      firstName: 'Test',
      lastName: 'User'
    }
    const view = vi.fn(() => 'rendered')

    getHubAuthSession.mockReturnValue(authenticatedUser)
    getAccessibleModulesForHub.mockReturnValue(moduleDefinitions)
    createSpokeAuthToken.mockResolvedValue('Bearer token')
    global.fetch.mockImplementation(async (url) => ({
      ok: true,
      json: vi.fn().mockResolvedValue(
        url.includes('/cattle/')
          ? {
              species: {
                id: 'cattle',
                label: 'Cattle',
                url: '/cattle/home'
              },
              holdings: [
                {
                  farmName: 'My farm',
                  cph: '10/081/1234',
                  postcode: 'MK11 1AA',
                  businessName: 'My Livestock Ltd',
                  address: {
                    line1: '1 Farm Lane',
                    town: 'Milton Keynes',
                    postcode: 'MK11 1AA',
                    country: 'England'
                  },
                  holdingType: 'Permanent',
                  registeredKeeper: 'Test User',
                  herdMark: 'UK 123456',
                  count: 7,
                  url: '/cattle/home?cph=10%2F081%2F1234'
                }
              ],
              actions: [
                {
                  title: 'Check cattle records',
                  text: 'One record needs attention.',
                  url: '/cattle/home',
                  linkText: 'Review cattle'
                }
              ]
            }
          : {
              species: {
                id: 'sheep',
                label: 'Sheep',
                url: '/sheep/home'
              },
              holdings: [
                {
                  farmName: 'My farm',
                  cph: '10/081/1234',
                  postcode: 'MK11 1AA',
                  count: 12,
                  url: '/sheep/home?cph=10%2F081%2F1234'
                }
              ],
              actions: []
            }
      )
    }))

    const response = await homeController.handler(
      { headers: { 'x-cdp-request-id': 'trace-123' } },
      {
        view
      }
    )

    expect(response).toBe('rendered')
    expect(getAccessibleModulesForHub).toHaveBeenCalledWith(
      expect.objectContaining({ taxonomy: 'home' })
    )
    expect(createSpokeAuthToken).toHaveBeenCalledWith(
      expect.objectContaining({
        spokeId: 'cattle-home',
        taxonomyId: 'home',
        user: authenticatedUser
      }),
      expect.objectContaining({
        audience: 'livestock-spokes'
      })
    )
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3101/cattle/home/summary-data',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer token',
          'x-cdp-request-id': 'trace-123'
        }
      })
    )
    expect(view).toHaveBeenCalledWith(
      'home/summary',
      expect.objectContaining({
        authenticatedUser,
        dashboardMessages: [
          {
            title: 'Check cattle records',
            text: 'One record needs attention.',
            url: '/cattle/home',
            linkText: 'Review cattle'
          }
        ],
        farms: expect.arrayContaining([
          expect.objectContaining({
            name: 'My farm',
            cphs: expect.arrayContaining([
              expect.objectContaining({
                id: '10/081/1234',
                postcode: 'MK11 1AA',
                businessName: 'My Livestock Ltd',
                species: expect.arrayContaining([
                  {
                    id: 'cattle',
                    label: 'Cattle',
                    count: 7,
                    url: '/cattle/home?cph=10%2F081%2F1234'
                  },
                  {
                    id: 'sheep',
                    label: 'Sheep',
                    count: 12,
                    url: '/sheep/home?cph=10%2F081%2F1234'
                  }
                ])
              })
            ])
          })
        ]),
        activeHolding: expect.objectContaining({
          id: '10/081/1234',
          name: 'My farm',
          animalsUrl: '/cattle/home?cph=10%2F081%2F1234',
          errorsUrl: '/cattle/home',
          businessName: 'My Livestock Ltd',
          holdingType: 'Permanent',
          registeredKeeper: 'Test User',
          herdMark: 'UK 123456'
        })
      })
    )
  })

  test('Should surface unavailable species summaries as dashboard messages', async () => {
    const authenticatedUser = {
      sub: 'user-1',
      firstName: 'Test',
      lastName: 'User'
    }
    const view = vi.fn(() => 'rendered')

    getHubAuthSession.mockReturnValue(authenticatedUser)
    getAccessibleModulesForHub.mockReturnValue([moduleDefinitions[0]])
    createSpokeAuthToken.mockResolvedValue('Bearer token')
    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    })

    await homeController.handler({ headers: {} }, { view })

    expect(view).toHaveBeenCalledWith(
      'home/summary',
      expect.objectContaining({
        dashboardMessages: [
          {
            title: 'Cattle summary unavailable',
            text: 'Error fetching livestock summary, please try again later.'
          }
        ],
        farms: []
      })
    )
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch spoke summary for cattle-home: 503 Service Unavailable'
    )
  })
})
