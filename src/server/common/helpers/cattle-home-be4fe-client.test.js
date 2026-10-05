import { afterEach, describe, expect, test, vi } from 'vitest'

import { cattleHomeBe4FeClient as client } from './cattle-home-be4fe-client.js'

describe('CattleHomeBe4FeClient.getUserDetails()', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('requests the user and returns the payload data', async () => {
    // Arrange
    const data = { subject: 'user-1', cphs: [{ cph: '12/345/0001' }] }
    const get = vi
      .spyOn(client, '_get')
      .mockResolvedValueOnce({ res: { statusCode: 200 }, payload: { data } })

    // Act
    const result = await client.getUserDetails('user-1')

    // Assert
    expect(get).toHaveBeenCalledWith('api/users/user-1')
    expect(result).toEqual(data)
  })

  test('percent-encodes the user ID', async () => {
    // Arrange
    const get = vi.spyOn(client, '_get').mockResolvedValueOnce({
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
    vi.spyOn(client, '_get').mockRejectedValueOnce(notFoundError)

    // Act
    const result = await client.getUserDetails('user-1')

    // Assert
    expect(result).toBeNull()
  })

  test('propagates request errors', async () => {
    // Arrange
    vi.spyOn(client, '_get').mockRejectedValueOnce(new Error('be4fe down'))

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
