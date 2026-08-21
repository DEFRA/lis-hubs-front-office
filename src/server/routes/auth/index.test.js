import { describe, expect, test, vi } from 'vitest'

const { createHubAuthPlugin, configGet, fetchUserProfile } = vi.hoisted(() => ({
  createHubAuthPlugin: vi.fn(async () => ({
    plugin: { name: 'auth', register: () => undefined }
  })),
  configGet: vi.fn(),
  fetchUserProfile: vi.fn()
}))

vi.mock('@defra/lis-hubs-infra-access/auth', async () => {
  const actual = await vi.importActual('@defra/lis-hubs-infra-access/auth')

  return {
    ...actual,
    createHubAuthPlugin
  }
})

vi.mock('#config/config.js', () => ({
  config: {
    get: configGet
  }
}))

vi.mock('#server/common/helpers/clients.js', () => ({
  ishClient: { fetchUserProfile }
}))

function createConfigValueMap() {
  return {
    'auth.oidc.discoveryUrl':
      'https://identity.example/.well-known/openid-configuration',
    'auth.oidc.clientId': 'hub-client',
    'auth.oidc.clientSecret': 'secret',
    'auth.oidc.redirectPath': '/sso',
    'auth.oidc.serviceId': 'livestock-hub',
    'auth.hubOrigin': 'https://front-office.example',
    'auth.hubJwt.cookieName': 'livestock_hub_jwt',
    'auth.hubJwt.secret': 'test-hub-secret-please-change-1234567890',
    'auth.hubJwt.issuer': 'http://localhost:3101',
    'auth.hubJwt.audience': 'livestock-spokes',
    'auth.hubJwt.ttlSeconds': 14400,
    'session.cookie.secure': false
  }
}

describe('#frontOfficeAuthRoutes', () => {
  test('builds the hub auth plugin from the configured OIDC provider', async () => {
    // Arrange
    const configValues = createConfigValueMap()
    configGet.mockImplementation((path) => configValues[path])

    // Act
    let error
    try {
      await import('./index.js')
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).not.toBeDefined()
    const options = createHubAuthPlugin.mock.calls[0][0]
    expect(options.provider).toEqual({
      discoveryUrl: 'https://identity.example/.well-known/openid-configuration',
      clientId: 'hub-client',
      clientSecret: 'secret',
      redirectPath: '/sso',
      serviceId: 'livestock-hub'
    })
    expect(options.hubOrigin).toBe('https://front-office.example')
    expect(options.loginPath).toBe('/auth/login')
    expect(typeof options.mapUser).toBe('function')
    expect(typeof options.resolveAuthSession).toBe('function')
  })

  test('translates profile roles when resolving an auth session', async () => {
    // Arrange
    vi.resetModules()
    createHubAuthPlugin.mockClear()
    const configValues = createConfigValueMap()
    configGet.mockImplementation((path) => configValues[path])
    const directAssignment = {
      id: 'assignment-1',
      countyParishHoldingId: 'cph-1',
      countyParishHoldingNumber: '10/081/1234',
      userId: 'test-user',
      roleId: 'role-1',
      roleName: 'Keeper',
      email: 'test.user@example.com',
      displayName: 'Test User'
    }
    fetchUserProfile.mockResolvedValue({
      directAssignments: [directAssignment]
    })
    await import('./index.js')
    const { resolveAuthSession } = createHubAuthPlugin.mock.calls[0][0]

    // Act
    let result, error
    try {
      result = await resolveAuthSession({ user: { sub: 'test-user' } })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).not.toBeDefined()
    expect(fetchUserProfile).toHaveBeenCalledWith('test-user')
    expect(result.roles).toEqual([
      'lis-role-reader',
      'lis-role-front-office',
      'lis-role-cattle-read',
      'lis-role-cattle-register-write',
      'lis-role-cattle-home-write',
      'lis-role-cattle-death-write',
      'lis-role-cattle-move-write',
      'lis-role-sheep-read',
      'lis-role-sheep-register-write',
      'lis-role-sheep-home-write',
      'lis-role-sheep-death-write',
      'lis-role-sheep-move-write'
    ])
    expect(result.holdings).toEqual([directAssignment])
  })
})
