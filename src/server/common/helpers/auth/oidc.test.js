import { beforeAll, describe, expect, test, vi } from 'vitest'

const { configGet, createOidcClient } = vi.hoisted(() => ({
  configGet: vi.fn((path) => `configured:${path}`),
  createOidcClient: vi.fn(() => ({
    buildAuthorizationUrl: vi.fn(),
    buildLogoutUrl: vi.fn(),
    completeAuthorizationCodeGrant: vi.fn(),
    getOidcMetadata: vi.fn()
  }))
}))

vi.mock('@defra/lis-hubs-infra-access/auth', () => ({ createOidcClient }))
vi.mock('#config/config.js', () => ({ config: { get: configGet } }))

describe('#oidc', () => {
  let options

  beforeAll(async () => {
    await import('./oidc.js')
    options = createOidcClient.mock.calls[0][0]
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

  test('Should map a complete identity payload', () => {
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

    expect(options.mapUser(payload)).toEqual(payload)
  })

  test('Should safely default optional identity claims', () => {
    expect(
      options.mapUser({ sub: 'user-1', roles: 'invalid', amr: null })
    ).toEqual({
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
