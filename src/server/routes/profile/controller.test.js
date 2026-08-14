import { beforeEach, describe, expect, test, vi } from 'vitest'

const { fetchUserProfile } = vi.hoisted(() => ({
  fetchUserProfile: vi.fn()
}))

vi.mock('#server/common/helpers/clients.js', () => ({
  ishClient: { fetchUserProfile }
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

  test('Should redirect unauthenticated users to the login flow', async () => {
    const redirect = vi.fn(() => 'redirected')

    const response = await profileController.handler(
      {
        app: {}
      },
      {
        redirect
      }
    )

    expect(response).toBe('redirected')
    expect(redirect).toHaveBeenCalledWith('/auth/login?returnUrl=/profile')
  })

  test('Should render the enriched front-office profile view for authenticated users', async () => {
    const authenticatedUser = {
      sub: 'test-user',
      firstName: 'Test',
      lastName: 'User',
      email: 'test.user@example.com'
    }
    const profile = {
      directAssignments: [
        {
          id: 'assignment-1',
          countyParishHoldingId: 'cph-1',
          countyParishHoldingNumber: '12/345/6789',
          userId: 'test-user',
          roleId: 'role-1',
          roleName: 'Keeper',
          email: 'test.user@example.com',
          displayName: 'Test User'
        }
      ]
    }
    const view = vi.fn(() => 'rendered')

    fetchUserProfile.mockResolvedValue(profile)

    const response = await profileController.handler(
      {
        app: {
          hubAuth: authenticatedUser
        }
      },
      {
        view
      }
    )

    expect(response).toBe('rendered')
    expect(fetchUserProfile).toHaveBeenCalledWith(authenticatedUser.sub)
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
              roleName: 'Keeper',
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
    const profile = {
      directAssignments: [
        {
          id: 'assignment-1',
          countyParishHoldingId: 'cph-1',
          countyParishHoldingNumber: '12/345/6789',
          userId: 'test-user',
          roleId: 'role-1',
          roleName: 'Keeper',
          email: 'test.user@example.com',
          displayName: 'Test User',
          longitude: -3.51,
          latitude: 54.21
        }
      ]
    }
    const view = vi.fn(() => 'rendered')

    fetchUserProfile.mockResolvedValue(profile)

    await profileController.handler(
      {
        app: {
          hubAuth: authenticatedUser
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
})
