import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

const {
  configGet,
  createOidcClient,
  derivePseudonymousUserId,
  requestContext
} = vi.hoisted(() => ({
  configGet: vi.fn((path) => `configured:${path}`),
  createOidcClient: vi.fn(() => ({
    buildAuthorizationUrl: vi.fn(),
    buildLogoutUrl: vi.fn(),
    completeAuthorizationCodeGrant: vi.fn(),
    getOidcMetadata: vi.fn()
  })),
  derivePseudonymousUserId: vi.fn(),
  requestContext: { set: vi.fn() }
}))

vi.mock('@defra/lis-hubs-infra-access/auth', () => ({ createOidcClient }))
vi.mock('@defra/lis-hubs-infra-core', () => ({
  derivePseudonymousUserId,
  requestContext
}))
vi.mock('#config/config.js', () => ({ config: { get: configGet } }))

describe('#oidc', () => {
  let options

  beforeAll(async () => {
    await import('./oidc.js')
    options = createOidcClient.mock.calls[0][0]
  })

  afterEach(() => {
    requestContext.set.mockClear()
  })

  test('Should configure the Defra CI provider from application config', () => {
    expect(options.getProviderConfig()).toEqual({
      discoveryUrl: 'configured:auth.oidc.discoveryUrl',
      clientId: 'configured:auth.oidc.clientId',
      clientSecret: 'configured:auth.oidc.clientSecret',
      redirectPath: 'configured:auth.oidc.redirectPath',
      serviceId: 'configured:auth.oidc.serviceId'
    })
    expect(options.getHubOrigin()).toBe('configured:auth.hubOrigin')
    expect(options.getPrimaryProviderId()).toBe('defra-ci')
  })

  test('Should map a complete identity payload and set user_id in the request context', () => {
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
    derivePseudonymousUserId.mockReturnValue('hashed-user-1')

    const result = options.mapUser(payload)

    expect(result).toEqual({ ...payload, user_id: 'hashed-user-1' })
    expect(derivePseudonymousUserId).toHaveBeenCalledWith(
      'user@example.com',
      'configured:auth.userIdHashSecret'
    )
    expect(requestContext.set).toHaveBeenCalledWith('user_id', 'hashed-user-1')
  })

  test('Should safely default optional identity claims and not set user_id when it cannot be derived', () => {
    derivePseudonymousUserId.mockReturnValue(null)

    const result = options.mapUser({
      sub: 'user-1',
      roles: 'invalid',
      amr: null
    })

    expect(result).toEqual({
      sub: 'user-1',
      email: '',
      firstName: '',
      lastName: '',
      serviceId: 'configured:auth.oidc.serviceId',
      roles: [],
      loa: '',
      amr: [],
      user_id: null
    })
    expect(requestContext.set).not.toHaveBeenCalled()
  })
})
