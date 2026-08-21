import { describe, expect, test, vi } from 'vitest'

import { config } from '#config/config.js'
import { mapUser } from './map-user.js'

vi.mock('#config/config.js')

const mocks = {
  configGet: vi.mocked(config.get)
}

describe('mapUser()', () => {
  test('maps a complete identity payload', () => {
    // Arrange
    const payload = {
      sub: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      serviceId: 'service-1',
      roles: ['user'],
      loa: 'substantial',
      amr: ['pwd']
    }

    // Act
    const result = mapUser(payload)

    // Assert
    expect(result).toEqual(payload)
  })

  test('safely defaults optional identity claims', () => {
    // Arrange
    mocks.configGet.mockReturnValue('configured:auth.oidc.serviceId')
    const payload = { sub: 'user-1', roles: 'invalid', amr: null }

    // Act
    const result = mapUser(payload)

    // Assert
    expect(result).toEqual({
      sub: 'user-1',
      email: '',
      firstName: '',
      lastName: '',
      serviceId: 'configured:auth.oidc.serviceId',
      roles: [],
      loa: '',
      amr: []
    })
  })
})
