import { HUB_AUTH_STRATEGY } from '@defra/lis-hubs-infra-access/authentication'
import { describe, expect, test } from 'vitest'

import { createServer } from '#server/server.js'

describe('#accessDenied', () => {
  test('Should show the no-access page without needing a session', async () => {
    const server = await createServer()
    await server.initialize()

    const response = await server.inject({
      method: 'GET',
      url: '/auth/access-denied'
    })

    await server.stop({ timeout: 0 })

    expect(response.statusCode).toBe(403)
    expect(response.result).toContain(
      'You do not have permission to use this service yet'
    )
    expect(response.result).not.toContain('Sign out')
  })

  test('Should offer sign out to a signed-in user who is not authorised', async () => {
    // Arrange
    const server = await createServer()
    await server.initialize()

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/auth/access-denied',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: {
          user: { sub: 'user-1', statements: [] },
          authorizedSpecies: [],
          refused: true
        }
      }
    })
    await server.stop({ timeout: 0 })

    // Assert
    expect(response.statusCode).toBe(403)
    expect(response.result).toContain(
      'You do not have permission to use this service yet'
    )
    expect(response.result).toMatch(
      /<a href="\/signout"[^>]*class="govuk-button"[^>]*>\s*Sign out\s*<\/a>/
    )
  })
})
