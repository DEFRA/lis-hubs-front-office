import hapi from '@hapi/hapi'
import { verifyHubJwt } from '@defra/lis-hubs-infra-access/authentication'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const {
  buildAuthorizationUrl,
  buildLogoutUrl,
  completeAuthorizationCodeGrant,
  configGet,
  createUser
} = vi.hoisted(() => ({
  buildAuthorizationUrl: vi.fn(),
  buildLogoutUrl: vi.fn(),
  completeAuthorizationCodeGrant: vi.fn(),
  configGet: vi.fn(),
  createUser: vi.fn()
}))

vi.mock('#server/common/helpers/cattle-home-be4fe-client.js', () => ({
  cattleHomeBe4FeClient: { createUser }
}))

vi.mock('#config/config.js', () => ({
  config: {
    get: configGet
  }
}))

vi.mock('#server/common/helpers/auth/oidc.js', () => ({
  buildAuthorizationUrl,
  buildLogoutUrl,
  completeAuthorizationCodeGrant
}))

import { auth } from './index.js'

const jwtConfig = {
  secret: 'test-hub-secret-please-change-1234567890',
  issuer: 'http://localhost:3101',
  audience: 'livestock-spokes'
}

function createConfigValueMap() {
  return {
    'auth.hubJwt.cookieName': 'livestock_hub_jwt',
    'auth.hubJwt.secret': jwtConfig.secret,
    'auth.hubJwt.issuer': jwtConfig.issuer,
    'auth.hubJwt.audience': jwtConfig.audience,
    'auth.hubJwt.ttlSeconds': 14400,
    'auth.allowList.enabled': false,
    'auth.allowList.emails': []
  }
}

function extractCookieValue(setCookieHeader, cookieName) {
  const cookieHeader = (
    Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  ).find((value) => value.startsWith(`${cookieName}=`))

  if (!cookieHeader) {
    throw new Error(`Cookie ${cookieName} was not found in response`)
  }

  return decodeURIComponent(
    cookieHeader.split(';')[0].slice(cookieName.length + 1)
  )
}

async function createTestServer() {
  const server = hapi.server({
    state: {
      strictHeader: false
    }
  })

  await server.register(auth.plugin)

  return server
}

describe('#frontOfficeAuthRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const configValues = createConfigValueMap()
    configGet.mockImplementation((path) => configValues[path])
  })

  test('Should translate profile roles before minting the hub JWT', async () => {
    const user = {
      sub: 'test-user',
      email: 'test.user@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: ['caseworker'],
      serviceId: 'test-service',
      loa: 'substantial',
      amr: ['pwd']
    }
    const authSession = {
      ...user,
      idToken: 'id-token',
      authenticatedAt: '2026-05-15T10:00:00.000Z'
    }
    const userDetails = {
      subject: user.sub,
      cphs: [
        {
          cph: '10/081/1234',
          role: 'owner',
          holding_id: 'holding-1',
          holding_name: 'Oakfield Farm'
        }
      ]
    }

    completeAuthorizationCodeGrant.mockResolvedValue({
      user,
      authSession,
      accessToken: 'access-token',
      returnUrl: '/dashboard'
    })
    createUser.mockResolvedValue(userDetails)

    const server = await createTestServer()
    const response = await server.inject({
      method: 'GET',
      url: '/sso'
    })

    await server.stop({ timeout: 0 })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/dashboard')
    expect(createUser).toHaveBeenCalledWith({
      sub: user.sub,
      email: user.email,
      given_name: user.firstName,
      family_name: user.lastName
    })
    const token = extractCookieValue(
      response.headers['set-cookie'],
      'livestock_hub_jwt'
    )
    const payload = await verifyHubJwt(token, jwtConfig)

    expect(payload.sub).toBe(user.sub)
    expect(payload.statements).toEqual([
      { role: 'lis-role-reader', cphs: '*' },
      { role: 'lis-role-keeper', cphs: ['10/081/1234'] }
    ])
    expect('roles' in payload).toBe(false)
    expect('permissions' in payload).toBe(false)
    expect('roleAssignments' in payload).toBe(false)
    expect('permissionAssignments' in payload).toBe(false)
    expect(payload.holdings).toEqual([
      {
        countyParishHoldingId: 'holding-1',
        countyParishHoldingNumber: '10/081/1234',
        holdingName: 'Oakfield Farm',
        roleName: 'owner'
      }
    ])
    expect(payload.authzVersion).toBe(1)
  })

  test('Should refuse a user who is not on the allow-list to the access-denied page without a user account or JWT', async () => {
    const configValues = {
      ...createConfigValueMap(),
      'auth.allowList.enabled': true,
      'auth.allowList.emails': ['keeper@example.com']
    }
    configGet.mockImplementation((path) => configValues[path])
    const user = { sub: 'test-user', email: 'someone.else@example.com' }

    completeAuthorizationCodeGrant.mockResolvedValue({
      user,
      authSession: { ...user, idToken: 'id-token' },
      accessToken: 'access-token',
      returnUrl: '/dashboard'
    })

    const server = await createTestServer()
    const response = await server.inject({
      method: 'GET',
      url: '/sso'
    })

    await server.stop({ timeout: 0 })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/auth/access-denied')
    expect(buildLogoutUrl).not.toHaveBeenCalled()
    expect(createUser).not.toHaveBeenCalled()
    expect(
      extractCookieValue(response.headers['set-cookie'], 'livestock_hub_jwt')
    ).toBe('')
  })

  test('Should let a user on the allow-list sign in', async () => {
    const configValues = {
      ...createConfigValueMap(),
      'auth.allowList.enabled': true,
      'auth.allowList.emails': ['keeper@example.com']
    }
    configGet.mockImplementation((path) => configValues[path])
    const user = { sub: 'test-user', email: 'Keeper@example.com' }

    completeAuthorizationCodeGrant.mockResolvedValue({
      user,
      authSession: { ...user, idToken: 'id-token' },
      accessToken: 'access-token',
      returnUrl: '/dashboard'
    })
    createUser.mockResolvedValue({ subject: user.sub, cphs: [] })

    const server = await createTestServer()
    const response = await server.inject({
      method: 'GET',
      url: '/sso'
    })

    await server.stop({ timeout: 0 })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/dashboard')
    expect(createUser).toHaveBeenCalled()
  })

  test('Should not issue a hub JWT when the user account cannot be created', async () => {
    const user = { sub: 'test-user', email: 'test.user@example.com' }
    const conflictError = new Error('409 - Email is bound to another account')
    conflictError.statusCode = 409

    completeAuthorizationCodeGrant.mockResolvedValue({
      user,
      authSession: { ...user, idToken: 'id-token' },
      accessToken: 'access-token',
      returnUrl: '/dashboard'
    })
    createUser.mockRejectedValue(conflictError)

    const server = await createTestServer()
    const response = await server.inject({
      method: 'GET',
      url: '/sso'
    })

    await server.stop({ timeout: 0 })

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  test('Should redirect to the provider authorization URL for a new front-office login', async () => {
    buildAuthorizationUrl.mockResolvedValue(
      'https://defra-ci.example.test/login'
    )

    const server = await createTestServer()
    const response = await server.inject({
      method: 'GET',
      url: '/auth/login?returnUrl=/'
    })

    await server.stop({ timeout: 0 })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      'https://defra-ci.example.test/login'
    )
    expect(buildAuthorizationUrl).toHaveBeenCalledWith(
      expect.any(Object),
      undefined
    )
  })

  test('Should return a service unavailable response when OIDC login configuration is invalid', async () => {
    buildAuthorizationUrl.mockRejectedValue(
      new Error('OIDC discovery URL is not configured for provider defra-ci')
    )

    const server = await createTestServer()
    const response = await server.inject({
      method: 'GET',
      url: '/auth/login?returnUrl=/'
    })

    await server.stop({ timeout: 0 })

    expect(response.statusCode).toBe(503)
    expect(response.result).toContain(
      'Authentication is not available. Check the hub OIDC configuration.'
    )
  })
})
