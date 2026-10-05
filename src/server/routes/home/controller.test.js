import { afterEach, describe, expect, test, vi } from 'vitest'

import { cattleHomeBe4FeClient } from '#server/common/helpers/cattle-home-be4fe-client.js'

const { moduleDefinitions, speciesDefinitions } = vi.hoisted(() => ({
  moduleDefinitions: [{ id: 'cattle-home' }, { id: 'sheep-home' }],
  speciesDefinitions: [
    { id: 'cattle', code: 'ctt', label: 'Cattle' },
    { id: 'sheep', code: 'shp', label: 'Sheep' },
    { id: 'camlid', code: 'cml', label: 'Camlid' },
    { id: 'chicken', code: 'chk', label: 'Chicken' },
    { id: 'goat', code: 'gt', label: 'Goat' }
  ]
}))

vi.mock('@defra/lis-hubs-infra-registry', () => ({
  MODULES: moduleDefinitions,
  SPECIES: speciesDefinitions
}))
vi.mock('#server/common/helpers/cattle-home-be4fe-client.js')

import { homeController } from './controller.js'

const mocks = {
  getUserDetails: vi.mocked(cattleHomeBe4FeClient.getUserDetails)
}

describe('#frontOfficeHomeController', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('Should render the welcome view for unauthenticated users', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')

    // Act
    const response = await homeController.handler(
      { auth: { isAuthenticated: false, credentials: null } },
      { view }
    )

    // Assert
    expect(response).toBe('rendered')
    expect(mocks.getUserDetails).not.toHaveBeenCalled()
    expect(view).toHaveBeenCalledWith(
      'home/welcome',
      expect.objectContaining({
        pageTitle: 'Welcome',
        heading: 'Livestock Information',
        loginUrl: '/auth/login?returnUrl=/',
        supportedSpecies: speciesDefinitions,
        supportedSpokes: moduleDefinitions
      })
    )
  })

  test('Should render the holdings view when the user has several holdings', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')
    const request = {
      auth: { isAuthenticated: true, credentials: { user: { sub: 'user-1' } } }
    }
    mocks.getUserDetails.mockResolvedValueOnce({
      subject: 'user-1',
      cphs: [
        {
          cph: '12/345/0001',
          role: 'Owner',
          holding_id: 'holding-1',
          holding_name: 'Oakfield Farm'
        },
        {
          cph: '24/118/0042',
          role: 'Agent',
          holding_id: 'holding-2',
          holding_name: 'Willow Brook Farm'
        }
      ]
    })

    // Act
    const response = await homeController.handler(request, { view })

    // Assert
    expect(response).toBe('rendered')
    expect(mocks.getUserDetails).toHaveBeenCalledWith('user-1')
    expect(view).toHaveBeenCalledWith('home/holdings', {
      pageTitle: 'My holdings',
      holdings: [
        {
          countyParishHoldingId: 'holding-1',
          countyParishHoldingNumber: '12/345/0001',
          holdingName: 'Oakfield Farm',
          roleName: 'Owner'
        },
        {
          countyParishHoldingId: 'holding-2',
          countyParishHoldingNumber: '24/118/0042',
          holdingName: 'Willow Brook Farm',
          roleName: 'Agent'
        }
      ]
    })
  })

  test('Should redirect to the cattle holding page when the user has a single holding', async () => {
    // Arrange
    const view = vi.fn()
    const redirect = vi.fn(() => 'redirected')
    const request = {
      auth: { isAuthenticated: true, credentials: { user: { sub: 'user-1' } } }
    }
    mocks.getUserDetails.mockResolvedValueOnce({
      subject: 'user-1',
      cphs: [
        {
          cph: '12/345/0001',
          role: 'Owner',
          holding_id: 'holding-1',
          holding_name: 'Oakfield Farm'
        }
      ]
    })

    // Act
    const response = await homeController.handler(request, { view, redirect })

    // Assert
    expect(response).toBe('redirected')
    expect(redirect).toHaveBeenCalledWith('/cattle/holdings/12/345/0001')
    expect(view).not.toHaveBeenCalled()
  })

  test('Should render the no-holdings view when the user has no CPHs', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')
    const request = {
      auth: { isAuthenticated: true, credentials: { user: { sub: 'user-1' } } }
    }
    mocks.getUserDetails.mockResolvedValueOnce({ subject: 'user-1', cphs: [] })

    // Act
    await homeController.handler(request, { view })

    // Assert
    expect(view).toHaveBeenCalledWith('home/no-holdings', {
      pageTitle: 'My holdings'
    })
  })

  test('Should render the no-holdings view when the BE4FE does not know the user', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')
    const request = {
      auth: { isAuthenticated: true, credentials: { user: { sub: 'user-1' } } }
    }
    mocks.getUserDetails.mockResolvedValueOnce(null)

    // Act
    await homeController.handler(request, { view })

    // Assert
    expect(view).toHaveBeenCalledWith('home/no-holdings', {
      pageTitle: 'My holdings'
    })
  })

  test('Should propagate a BE4FE failure for authenticated users', async () => {
    // Arrange
    const view = vi.fn()
    const request = {
      auth: { isAuthenticated: true, credentials: { user: { sub: 'user-1' } } }
    }
    mocks.getUserDetails.mockRejectedValueOnce(new Error('be4fe unavailable'))

    // Act
    let error
    try {
      await homeController.handler(request, { view })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toEqual(new Error('be4fe unavailable'))
    expect(view).not.toHaveBeenCalled()
  })
})
