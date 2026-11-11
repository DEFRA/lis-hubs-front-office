import { afterEach, describe, expect, test, vi } from 'vitest'
import { createServiceClient } from '@defra/lis-hubs-infra-core'

import * as client from './cattle-home-be4fe-client.js'

const service = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@defra/lis-hubs-infra-core', () => ({
  createServiceClient: vi.fn(() => service)
}))

describe('CattleHomeBe4FeClient.getUserDetails()', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  test('requests the user and returns the payload data', async () => {
    // Arrange
    const data = { subject: 'user-1', cphs: [{ cph: '12/345/0001' }] }
    const get = service.get.mockResolvedValueOnce({
      res: { statusCode: 200 },
      payload: { data }
    })

    // Act
    const result = await client.getUserDetails('user-1')

    // Assert
    expect(get).toHaveBeenCalledWith('api/users/user-1')
    expect(result).toEqual(data)
  })

  test('percent-encodes the user ID', async () => {
    // Arrange
    const get = service.get.mockResolvedValueOnce({
      res: { statusCode: 200 },
      payload: { data: {} }
    })

    // Act
    await client.getUserDetails('sub/with slash')

    // Assert
    expect(get).toHaveBeenCalledWith('api/users/sub%2Fwith%20slash')
  })

  test('returns null when the BE4FE does not know the user', async () => {
    // Arrange
    const notFoundError = new Error('Request failed - 404')
    notFoundError.statusCode = 404
    service.get.mockRejectedValueOnce(notFoundError)

    // Act
    const result = await client.getUserDetails('user-1')

    // Assert
    expect(result).toBeNull()
  })

  test('propagates request errors', async () => {
    // Arrange
    service.get.mockRejectedValueOnce(new Error('be4fe down'))

    // Act
    let error
    try {
      await client.getUserDetails('user-1')
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toEqual(new Error('be4fe down'))
  })
})

describe('CattleHomeBe4FeClient.createUser()', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  test('posts the claims and returns the payload data', async () => {
    // Arrange
    const claims = {
      sub: 'user-1',
      email: 'keeper@example.com',
      given_name: 'Test',
      family_name: 'User'
    }
    const data = { subject: 'user-1', cphs: [{ cph: '12/345/0001' }] }
    const post = service.post.mockResolvedValueOnce({
      res: { statusCode: 200 },
      payload: { data }
    })

    // Act
    const result = await client.createUser(claims)

    // Assert
    expect(post).toHaveBeenCalledWith('api/users', { payload: claims })
    expect(result).toEqual(data)
  })

  test('propagates request errors', async () => {
    // Arrange
    const claims = { sub: 'user-1', email: 'keeper@example.com' }
    const conflictError = new Error('409 - Email is bound to another account')
    conflictError.statusCode = 409
    service.post.mockRejectedValueOnce(conflictError)

    // Act
    let error
    try {
      await client.createUser(claims)
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBe(conflictError)
  })
})

describe('CattleHomeBe4FeClient circuit breaker', () => {
  afterEach(() => {
    vi.resetAllMocks()
    vi.unstubAllEnvs()
  })

  test('uses the configured failure threshold', async () => {
    // Arrange
    vi.stubEnv('CATTLE_HOME_API_CIRCUIT_BREAKER_FAILURE_THRESHOLD', '1')
    vi.resetModules()
    vi.mocked(createServiceClient).mockReturnValueOnce(service)

    // Act
    await import('./cattle-home-be4fe-client.js')

    // Assert
    expect(vi.mocked(createServiceClient)).toHaveBeenLastCalledWith(
      expect.objectContaining({
        circuitBreaker: expect.objectContaining({ failureThreshold: 1 })
      })
    )
  })
})

describe('CattleHomeBe4FeClient.getCattleOnHolding()', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  test('requests the cattle list and returns the payload data', async () => {
    // Arrange
    const data = [
      { cattle_id: 'UK123', eartag: 'UK123' },
      { cattle_id: 'UK124', eartag: 'UK124' }
    ]
    const get = service.get.mockResolvedValueOnce({
      res: { statusCode: 200 },
      payload: { data }
    })

    // Act
    const result = await client.getCattleOnHolding('12/345/0001')

    // Assert
    expect(get).toHaveBeenCalledWith('api/cphs/12/345/0001/cattle')
    expect(result).toEqual(data)
  })

  test('returns null when the BE4FE does not know the holding', async () => {
    // Arrange
    const notFoundError = new Error('Request failed - 404')
    notFoundError.statusCode = 404
    service.get.mockRejectedValueOnce(notFoundError)

    // Act
    const result = await client.getCattleOnHolding('12/345/0001')

    // Assert
    expect(result).toBeNull()
  })

  test('rejects a CPH that is not county/parish/holding', async () => {
    // Arrange
    const get = service.get

    // Act
    let error
    try {
      await client.getCattleOnHolding('12/345')
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toEqual(
      new TypeError('CPH must contain county, parish and holding')
    )
    expect(get).not.toHaveBeenCalled()
  })

  test('propagates request errors', async () => {
    // Arrange
    service.get.mockRejectedValueOnce(new Error('be4fe down'))

    // Act
    let error
    try {
      await client.getCattleOnHolding('12/345/0001')
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toEqual(new Error('be4fe down'))
  })
})
