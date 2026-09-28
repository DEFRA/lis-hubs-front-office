import { afterEach, describe, expect, test, vi } from 'vitest'

import { krdsClient } from '#server/common/helpers/clients.js'

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
vi.mock('#server/common/helpers/clients.js')

import { homeController } from './controller.js'

const mocks = {
  fetchUserAccount: vi.mocked(krdsClient.fetchUserAccount)
}

describe('#frontOfficeHomeController', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('Should render the welcome view for unauthenticated users', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')

    // Act
    const response = await homeController.handler({}, { view })

    // Assert
    expect(response).toBe('rendered')
    expect(mocks.fetchUserAccount).not.toHaveBeenCalled()
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

  test('Should render the holdings view when the account has several holdings', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')
    const request = { app: { hubAuth: { sub: 'user-1' } } }
    mocks.fetchUserAccount.mockResolvedValueOnce({
      cphAssociations: [
        {
          id: 'association-1',
          cphNumber: '12/345/0001',
          role: 'Owner',
          holdingId: 'holding-1',
          holdingName: 'Oakfield Farm'
        },
        {
          id: 'association-2',
          cphNumber: '24/118/0042',
          role: 'Agent',
          holdingId: 'holding-2',
          holdingName: 'Willow Brook Farm'
        }
      ]
    })

    // Act
    const response = await homeController.handler(request, { view })

    // Assert
    expect(response).toBe('rendered')
    expect(mocks.fetchUserAccount).toHaveBeenCalledWith('user-1')
    expect(view).toHaveBeenCalledWith('home/holdings', {
      pageTitle: 'My holdings',
      holdings: [
        {
          id: 'association-1',
          countyParishHoldingId: 'holding-1',
          countyParishHoldingNumber: '12/345/0001',
          holdingName: 'Oakfield Farm',
          roleName: 'Owner'
        },
        {
          id: 'association-2',
          countyParishHoldingId: 'holding-2',
          countyParishHoldingNumber: '24/118/0042',
          holdingName: 'Willow Brook Farm',
          roleName: 'Agent'
        }
      ]
    })
  })

  test('Should redirect to the cattle holding page when the account has a single holding', async () => {
    // Arrange
    const view = vi.fn()
    const redirect = vi.fn(() => 'redirected')
    const request = { app: { hubAuth: { sub: 'user-1' } } }
    mocks.fetchUserAccount.mockResolvedValueOnce({
      cphAssociations: [
        {
          id: 'association-1',
          cphNumber: '12/345/0001',
          role: 'Owner',
          holdingId: 'holding-1',
          holdingName: 'Oakfield Farm'
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

  test('Should render the no-holdings view when the account has no associations', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')
    const request = { app: { hubAuth: { sub: 'user-1' } } }
    mocks.fetchUserAccount.mockResolvedValueOnce({})

    // Act
    await homeController.handler(request, { view })

    // Assert
    expect(view).toHaveBeenCalledWith('home/no-holdings', {
      pageTitle: 'My holdings'
    })
  })

  test('Should propagate a krds failure for authenticated users', async () => {
    // Arrange
    const view = vi.fn()
    const request = { app: { hubAuth: { sub: 'user-1' } } }
    mocks.fetchUserAccount.mockRejectedValueOnce(new Error('krds unavailable'))

    // Act
    let error
    try {
      await homeController.handler(request, { view })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toEqual(new Error('krds unavailable'))
    expect(view).not.toHaveBeenCalled()
  })
})
