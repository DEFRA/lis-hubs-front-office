import { HUB_AUTH_STRATEGY } from '@defra/lis-hubs-infra-access/authentication'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'

const { getUserDetails, getCattleOnHolding } = vi.hoisted(() => ({
  getUserDetails: vi.fn(),
  getCattleOnHolding: vi.fn()
}))

vi.mock('#server/common/helpers/cattle-home-be4fe-client.js', () => ({
  cattleHomeBe4FeClient: {
    getUserDetails,
    getCattleOnHolding,
    createUser: vi.fn()
  }
}))

import { createServer } from '#server/server.js'

function credentialsFor(cphs) {
  return {
    user: {
      sub: 'user-1',
      statements: [
        {
          role: 'lis-role-cattle-read',
          cphs,
          permissions: ['lis-perm-cattle-read']
        }
      ]
    },
    authorizedSpecies: ['ctt'],
    refused: false
  }
}

describe('GET /holdings/{cph}', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('renders the holding overview for an entitled user', async () => {
    // Arrange
    getUserDetails.mockResolvedValueOnce({
      subject: 'user-1',
      cphs: [
        { cph: '12/345/0001', holding_name: 'Oakfield Farm', role: 'Owner' }
      ]
    })
    getCattleOnHolding.mockResolvedValueOnce([
      { cattle_id: 'UK1', eartag: 'UK1' },
      { cattle_id: 'UK2', eartag: 'UK2' },
      { cattle_id: 'UK3', eartag: 'UK3' }
    ])

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: credentialsFor(['12/345/0001'])
      }
    })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('>3<')
    expect(response.result).toContain('Oakfield Farm')
    expect(response.result).toContain('Cattle on holding')
    expect(response.result).toContain(
      'href="/cattle/holdings/12/345/0001/animals"'
    )
    expect(response.result).toContain('href="/cattle/register"')
    expect(response.result).toContain('up to 24 hours')
  })

  test('returns 404 for a holding the user may not read', async () => {
    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: credentialsFor(['24/118/0042'])
      }
    })

    // Assert
    expect(response.statusCode).toBe(404)
    expect(getUserDetails).not.toHaveBeenCalled()
    expect(getCattleOnHolding).not.toHaveBeenCalled()
  })

  test('redirects an anonymous user to sign in', async () => {
    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001'
    })

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      '/auth/login?returnUrl=%2Fholdings%2F12%2F345%2F0001'
    )
  })
})
