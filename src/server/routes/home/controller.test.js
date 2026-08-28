import { beforeEach, describe, expect, test, vi } from 'vitest'

const {
  createSpokeAuthToken,
  getAccessibleModulesForHub,
  getHubAuthSession,
  logger,
  requestContext,
  moduleDefinitions
} = vi.hoisted(() => ({
  createSpokeAuthToken: vi.fn(),
  getAccessibleModulesForHub: vi.fn(),
  getHubAuthSession: vi.fn(),
  logger: { error: vi.fn() },
  requestContext: { getHeaders: vi.fn(() => ({})) },
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
  'auth.hubOrigin': 'http://localhost:3101'
}

vi.mock('@defra/lis-hubs-infra-access', () => ({
  getAccessibleModulesForHub
}))

vi.mock('@defra/lis-hubs-infra-registry', () => ({
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

vi.mock('@defra/lis-hubs-infra-access/auth', () => ({
  createSpokeAuthToken,
  getHubAuthSession
}))

vi.mock('@defra/lis-hubs-infra-core', () => ({
  logger,
  requestContext
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
    requestContext.getHeaders.mockReturnValue({})
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
    requestContext.getHeaders.mockReturnValue({
      'x-cdp-request-id': 'trace-123'
    })

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
                  url: '/cattle/home?cph=10%2F081%2F1234',
                  animals: [
                    {
                      id: 'UK123456100001',
                      earTag: 'UK 123456 100001',
                      dateOfBirth: '2024-01-15',
                      dateRegistered: '2024-01-18',
                      sex: 'Female',
                      breed: 'Holstein Friesian',
                      status: 'saved'
                    },
                    {
                      id: 'UK123456100005',
                      earTag: 'UK 123456 100005',
                      dateOfBirth: '2024-03-27',
                      dateRegistered: '2024-04-02',
                      sex: 'Male',
                      breed: 'Hereford',
                      status: 'error',
                      errorReason: 'Ear tag did not match.'
                    }
                  ]
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
                  url: '/sheep/home?cph=10%2F081%2F1234',
                  animals: [
                    {
                      id: 'UK012345600001',
                      earTag: 'UK 012345 600001',
                      dateOfBirth: '2025-02-03',
                      sex: 'Female',
                      breed: 'Texel',
                      status: 'pending'
                    }
                  ]
                }
              ],
              actions: []
            }
      )
    }))

    const response = await homeController.handler(
      {},
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
        dashboardMessages: expect.arrayContaining([
          {
            title: 'Check cattle records',
            text: 'One record needs attention.',
            url: '/cattle/home',
            linkText: 'Review cattle'
          },
          {
            title: 'Animal records need attention',
            text: '1 animal record has an error.',
            url: '#animal-error',
            linkText: 'View animal error record'
          }
        ]),
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
          herdMark: 'UK 123456',
          animalsOnHolding: expect.arrayContaining([
            [
              { text: 'Cattle' },
              { text: 'UK 123456 100001' },
              { text: '15 January 2024' },
              { text: '18 January 2024' },
              { text: 'Female' },
              { text: 'Holstein Friesian' },
              {
                html: '<strong class="govuk-tag govuk-tag--green">Valid</strong>'
              }
            ],
            [
              { text: 'Cattle' },
              { text: 'UK 123456 100005' },
              { text: '27 March 2024' },
              { text: '2 April 2024' },
              { text: 'Male' },
              { text: 'Hereford' },
              {
                html: '<strong class="govuk-tag govuk-tag--red">Error</strong>'
              }
            ]
          ]),
          animalErrors: [
            {
              earTag: 'UK 123456 100005',
              summaryRows: [
                {
                  key: { text: 'Species' },
                  value: { text: 'Cattle' }
                },
                {
                  key: { text: 'Date of birth' },
                  value: { text: '27 March 2024' }
                },
                {
                  key: { text: 'Date of registration' },
                  value: { text: '2 April 2024' }
                },
                {
                  key: { text: 'Reason for error' },
                  value: {
                    text: 'Ear tag did not match.'
                  }
                }
              ]
            }
          ]
        })
      })
    )

    const animals = view.mock.calls[0][1].activeHolding.animalsOnHolding
    const statuses = animals.map((row) => row.at(-1).html)
    expect(
      statuses.filter((status) => status.includes('>Valid<'))
    ).toHaveLength(1)
    expect(
      statuses.filter((status) => status.includes('>Pending<'))
    ).toHaveLength(1)
    expect(
      statuses.filter((status) => status.includes('>Error<'))
    ).toHaveLength(1)
    expect(animals.map((row) => row[0].text)).toEqual([
      'Cattle',
      'Cattle',
      'Sheep'
    ])
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

  test('Should safely normalise incomplete and duplicate summary data', async () => {
    const view = vi.fn(() => 'rendered')
    const spoke = { ...moduleDefinitions[0], path: '/cattle/home/' }

    getHubAuthSession.mockReturnValue({ sub: 'user-1' })
    getAccessibleModulesForHub.mockReturnValue([spoke])
    createSpokeAuthToken.mockResolvedValue('Bearer token')
    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        actions: [{ text: 'Action text' }],
        holdings: [
          {
            farmName: '',
            cph: '12/345/0001',
            address: ['Farm', '', 'Town'],
            animals: [
              { status: 'valid' },
              {
                earTag: 'UK ERROR',
                status: 'failed',
                dateOfBirth: 'not-a-date'
              },
              { id: 'validated', statusLabel: 'Validated' },
              { id: 'validated', statusLabel: 'Validated' }
            ]
          },
          {
            farmName: '',
            cph: '12/345/0001',
            postcode: 'AB1 2CD',
            businessName: 'Farm Ltd',
            holdingType: 'Permanent',
            registeredKeeper: 'Keeper',
            herdMark: 'UK 123456'
          }
        ]
      })
    })

    await homeController.handler({ headers: {} }, { view })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3101/cattle/home/summary-data',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer token'
        }
      })
    )
    const result = view.mock.calls[0][1]
    expect(result.farms[0].name).toBe('Your farm')
    expect(result.activeHolding).toMatchObject({
      name: '',
      postcode: 'AB1 2CD',
      businessName: 'Farm Ltd',
      animalsUrl: undefined
    })
    expect(result.activeHolding.summaryRows[0].value.html).toContain('href="#"')
    expect(result.activeHolding.summaryRows[3].lines).toEqual(['Farm', 'Town'])
    expect(result.activeHolding.animalsOnHolding).toHaveLength(3)
    expect(result.activeHolding.animalsOnHolding[0]).toEqual(
      expect.arrayContaining([
        { text: 'Not available' },
        {
          html: '<strong class="govuk-tag govuk-tag--green">Valid</strong>'
        }
      ])
    )
    expect(result.activeHolding.animalErrors[0]).toEqual(
      expect.objectContaining({
        earTag: 'UK ERROR',
        summaryRows: expect.arrayContaining([
          {
            key: { text: 'Reason for error' },
            value: { text: 'The record could not be processed.' }
          }
        ])
      })
    )
    expect(result.dashboardMessages).toEqual(
      expect.arrayContaining([
        {
          title: 'Cattle action',
          text: 'Action text',
          url: undefined,
          linkText: 'View action'
        }
      ])
    )
  })

  test.each([
    ['1 Farm Lane\nTown', ['1 Farm Lane', 'Town']],
    [null, null]
  ])('Should normalise a %s holding address', async (address, expected) => {
    const view = vi.fn(() => 'rendered')

    getHubAuthSession.mockReturnValue({ sub: 'user-1' })
    getAccessibleModulesForHub.mockReturnValue([moduleDefinitions[0]])
    createSpokeAuthToken.mockResolvedValue('Bearer token')
    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        holdings: [{ cph: '12/345/0001', address }]
      })
    })

    await homeController.handler({ headers: {} }, { view })

    expect(view.mock.calls[0][1].activeHolding.summaryRows[3].lines).toEqual(
      expected
    )
  })
})
