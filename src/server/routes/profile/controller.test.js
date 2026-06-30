import { beforeEach, describe, expect, test, vi } from 'vitest'

const { fetchUserProfile } = vi.hoisted(() => ({
  fetchUserProfile: vi.fn()
}))

vi.mock('@livestock/ui-services', async () => {
  const actual = await vi.importActual('@livestock/ui-services')

  return {
    ...actual,
    createProfileService: vi.fn(() => fetchUserProfile)
  }
})

vi.mock('#config/config.js', () => ({
  config: {}
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
    const userProfile = {
      holdings: [
        {
          group_name: 'Hill Farm',
          cphs: [
            {
              cph: '12/345/6789',
              postcode: 'AB1 2CD',
              longitude: -3.51,
              latitude: 54.21
            }
          ]
        }
      ]
    }
    const view = vi.fn(() => 'rendered')

    fetchUserProfile.mockResolvedValue(userProfile)

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
    expect(fetchUserProfile).toHaveBeenCalledWith(authenticatedUser)
    expect(view).toHaveBeenCalledWith(
      'profile/index',
      expect.objectContaining({
        pageTitle: 'Profile',
        heading: 'Profile and Settings',
        userProfile: expect.objectContaining({
          user: authenticatedUser,
          holdings: [
            expect.objectContaining({
              mapUrl: expect.stringContaining('api.mapbox.com'),
              cphs: [
                expect.objectContaining({
                  idx: 1
                })
              ]
            })
          ]
        })
      })
    )
  })
})
