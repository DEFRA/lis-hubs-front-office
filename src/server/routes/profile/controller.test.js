import { beforeEach, describe, expect, test, vi } from 'vitest'

const { getUserDetails } = vi.hoisted(() => ({
  getUserDetails: vi.fn()
}))

vi.mock('#server/common/helpers/cattle-home-be4fe-client.js', () => ({
  cattleHomeBe4FeClient: { getUserDetails }
}))

vi.mock('#config/config.js', () => ({
  config: {
    get: vi.fn(() => 'test-mapbox-api-key')
  }
}))

import { profileController } from './controller.js'

describe('#profileController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should render the enriched front-office profile view for authenticated users', async () => {
    const authenticatedUser = {
      sub: 'test-user',
      firstName: 'Test',
      lastName: 'User',
      email: 'test.user@example.com'
    }
    const account = {
      subject: 'test-user',
      cphs: [
        {
          holding_id: 'holding-1',
          cph: '12/345/6789',
          role: 'owner',
          holding_name: 'Oakfield Farm'
        }
      ]
    }
    const view = vi.fn(() => 'rendered')

    getUserDetails.mockResolvedValue(account)

    const response = await profileController.handler(
      {
        auth: {
          isAuthenticated: true,
          credentials: { user: authenticatedUser }
        }
      },
      {
        view
      }
    )

    expect(response).toBe('rendered')
    expect(getUserDetails).toHaveBeenCalledWith(authenticatedUser.sub)
    expect(view).toHaveBeenCalledWith(
      'profile/index',
      expect.objectContaining({
        pageTitle: 'Profile',
        heading: 'Profile and Settings',
        userProfile: expect.objectContaining({
          user: authenticatedUser,
          holdings: [
            expect.objectContaining({
              countyParishHoldingNumber: '12/345/6789',
              roleName: 'owner',
              mapUrl: null
            })
          ]
        })
      })
    )
  })

  test('Should build a mapbox mapUrl for holdings with coordinates', async () => {
    const authenticatedUser = {
      sub: 'test-user',
      firstName: 'Test',
      lastName: 'User',
      email: 'test.user@example.com'
    }
    const account = {
      subject: 'test-user',
      cphs: [
        {
          holding_id: 'holding-1',
          cph: '12/345/6789',
          role: 'owner',
          holding_name: 'Oakfield Farm',
          longitude: -3.51,
          latitude: 54.21
        }
      ]
    }
    const view = vi.fn(() => 'rendered')

    getUserDetails.mockResolvedValue(account)

    await profileController.handler(
      {
        auth: {
          isAuthenticated: true,
          credentials: { user: authenticatedUser }
        }
      },
      {
        view
      }
    )

    expect(view).toHaveBeenCalledWith(
      'profile/index',
      expect.objectContaining({
        userProfile: expect.objectContaining({
          holdings: [
            expect.objectContaining({
              mapUrl: expect.stringContaining('api.mapbox.com')
            })
          ]
        })
      })
    )
  })

  test('Should render no holdings when the BE4FE does not know the user', async () => {
    // Arrange
    const authenticatedUser = { sub: 'test-user' }
    const view = vi.fn(() => 'rendered')
    getUserDetails.mockResolvedValueOnce(null)

    // Act
    await profileController.handler(
      { auth: { credentials: { user: authenticatedUser } } },
      { view }
    )

    // Assert
    expect(view).toHaveBeenCalledWith(
      'profile/index',
      expect.objectContaining({
        userProfile: { user: authenticatedUser, holdings: [] }
      })
    )
  })

  test('Should propagate a BE4FE failure', async () => {
    // Arrange
    const view = vi.fn()
    getUserDetails.mockRejectedValueOnce(new Error('be4fe unavailable'))

    // Act
    let error
    try {
      await profileController.handler(
        { auth: { credentials: { user: { sub: 'test-user' } } } },
        { view }
      )
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toEqual(new Error('be4fe unavailable'))
    expect(view).not.toHaveBeenCalled()
  })
})
