import { beforeEach, describe, expect, test, vi } from 'vitest'

const {
  createSpokeAuthToken,
  getAccessibleModulesForHub,
  logger,
  moduleDefinitions
} = vi.hoisted(() => ({
  createSpokeAuthToken: vi.fn(),
  getAccessibleModulesForHub: vi.fn(),
  logger: { error: vi.fn(), info: vi.fn() },
  moduleDefinitions: [
    {
      id: 'cattle-home',
      label: 'Home for Cattle',
      path: '/cattle/home',
      port: 3221,
      taxonomy: 'home',
      species: 'ctt',
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
  SPECIES: [{ code: 'ctt', label: 'Cattle' }],
  hydrateModuleMetadata: vi.fn((module) => ({
    ...module,
    taxonomyLabel: 'Home',
    speciesLabel: 'Cattle'
  }))
}))

vi.mock('@defra/lis-hubs-infra-access/auth', () => ({
  createSpokeAuthToken
}))

vi.mock('@defra/lis-hubs-infra-core', () => ({
  logger,
  requestContext: { getHeaders: vi.fn(() => ({})) }
}))

vi.mock('#config/config.js', () => ({
  config: {
    get: vi.fn((path) => configValues[path])
  }
}))

import { homeController } from './controller.js'

describe('#frontOfficeHomeController summary normalisation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  test('Should safely normalise incomplete and duplicate summary data', async () => {
    const view = vi.fn(() => 'rendered')
    const spoke = { ...moduleDefinitions[0], path: '/cattle/home/' }

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

    await homeController.handler(
      { app: { hubAuth: { sub: 'user-1' } }, headers: {} },
      { view }
    )

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

    getAccessibleModulesForHub.mockReturnValue([moduleDefinitions[0]])
    createSpokeAuthToken.mockResolvedValue('Bearer token')
    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        holdings: [{ cph: '12/345/0001', address }]
      })
    })

    await homeController.handler(
      { app: { hubAuth: { sub: 'user-1' } }, headers: {} },
      { view }
    )

    expect(view.mock.calls[0][1].activeHolding.summaryRows[3].lines).toEqual(
      expected
    )
  })

  test('Should handle an authenticated user with no identifier or spokes', async () => {
    const view = vi.fn(() => 'rendered')

    getAccessibleModulesForHub.mockReturnValue([])

    await homeController.handler({ app: { hubAuth: {} } }, { view })

    expect(logger.info).toHaveBeenCalledWith(
      'Building front-office dashboard [userId=unknown | spokes=none]'
    )
    expect(view).toHaveBeenCalledWith(
      'home/summary',
      expect.objectContaining({
        farms: [],
        activeHolding: null,
        dashboardMessages: []
      })
    )
  })

  test('Should use summary defaults when holdings and species are omitted', async () => {
    const view = vi.fn(() => 'rendered')

    getAccessibleModulesForHub.mockReturnValue([moduleDefinitions[0]])
    createSpokeAuthToken.mockResolvedValue('Bearer token')
    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await homeController.handler(
      { app: { hubAuth: { sub: 'user-1' } } },
      { view }
    )

    expect(view).toHaveBeenCalledWith(
      'home/summary',
      expect.objectContaining({
        farms: [],
        activeHolding: null,
        dashboardMessages: []
      })
    )
  })

  test('Should normalise multiple unidentified animal errors and object addresses', async () => {
    const view = vi.fn(() => 'rendered')

    getAccessibleModulesForHub.mockReturnValue([moduleDefinitions[0]])
    createSpokeAuthToken.mockResolvedValue('Bearer token')
    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        holdings: [
          {
            cph: '12/345/0001',
            address: {
              line1: '1 Farm Lane',
              line2: 'Village',
              town: 'Town',
              county: 'County',
              postcode: 'AB1 2CD',
              country: 'England'
            },
            animals: [
              { status: 'rejected' },
              { id: 'animal-2', status: 'error' }
            ]
          }
        ]
      })
    })

    await homeController.handler(
      { app: { hubAuth: { sub: 'user-1' } } },
      { view }
    )

    const { activeHolding, dashboardMessages } = view.mock.calls[0][1]
    expect(activeHolding.summaryRows[3].lines).toEqual([
      '1 Farm Lane<br>',
      'Village<br>',
      'Town<br>',
      'County<br>',
      'AB1 2CD<br>',
      'England<br>'
    ])
    expect(activeHolding.animalErrors.map(({ earTag }) => earTag)).toEqual([
      'Unknown animal',
      'animal-2'
    ])
    expect(dashboardMessages).toContainEqual(
      expect.objectContaining({
        text: '2 animal records have an error.'
      })
    )
  })
})
