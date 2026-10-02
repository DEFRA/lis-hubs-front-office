import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import { HUB_AUTH_STRATEGY } from '@defra/lis-hubs-infra-access/authentication'

import { krdsClient } from '#server/common/helpers/clients.js'

describe('#frontOfficeServer', () => {
  const originalLogFormat = process.env.LOG_FORMAT
  let createServer
  let server

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeAll(async () => {
    process.env.LOG_FORMAT = 'pretty'
    ;({ createServer } = await import('./server.js'))
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    if (server) {
      await server.stop({ timeout: 0 })
    }

    if (originalLogFormat === undefined) {
      delete process.env.LOG_FORMAT
    } else {
      process.env.LOG_FORMAT = originalLogFormat
    }
  })

  test('Should return a no-content favicon route for the front-office shell', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/favicon.ico'
    })

    expect(response.statusCode).toBe(204)
  })

  test('Should apply a content security policy header to front-office responses', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'self'"
    )
  })

  test('Should render the front-office welcome page', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('Livestock Information')
  })

  test('Should redirect signed-out profile requests to login', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/profile'
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/auth/login?returnUrl=%2Fprofile')
  })

  test('Should render the profile for signed-in users', async () => {
    // Arrange
    const fetchUserAccount = vi
      .spyOn(krdsClient, 'fetchUserAccount')
      .mockResolvedValue({ cphAssociations: [] })

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/profile',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: { user: { sub: 'user-1' }, authorizedSpecies: [] }
      }
    })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('Profile and Settings')
    expect(fetchUserAccount).toHaveBeenCalledWith('user-1')
  })

  test('Should render the holdings table', async () => {
    const result = await server.render('home/holdings', {
      pageTitle: 'My holdings',
      holdings: [
        {
          countyParishHoldingNumber: '12/345/0001',
          holdingName: 'Oakfield Farm',
          roleName: 'Owner'
        },
        {
          countyParishHoldingNumber: '24/118/0042',
          holdingName: null,
          roleName: 'Agent'
        }
      ]
    })

    expect(result).toContain('<h1 class="govuk-heading-xl">My holdings</h1>')
    expect(result).toContain(
      '<div class="lis-sortable-table__wrapper" tabindex="0" role="region" aria-label="My holdings table">'
    )
    expect(result).toContain(
      '<a class="govuk-link" href="/cattle/holdings/12/345/0001">12/345/0001</a>'
    )
    expect(result).toContain('<td class="govuk-table__cell">Oakfield Farm</td>')
    expect(result).toContain('<td class="govuk-table__cell">Agent</td>')
    expect(result).toContain(
      '<td class="govuk-table__cell"><strong class="govuk-tag govuk-tag--red">Not supplied</strong></td>'
    )
  })

  test('Should render the no-holdings page', async () => {
    const result = await server.render('home/no-holdings', {
      pageTitle: 'My holdings'
    })

    expect(result).toContain(
      'No holdings are currently linked to this account.'
    )
    expect(result).not.toContain('govuk-table')
  })
})

describe('log format mapping', () => {
  afterEach(() => {
    delete process.env.LOG_FORMAT
  })

  test('server.js maps LOG_FORMAT=pretty onto the logger pretty-print format', async () => {
    // Arrange
    process.env.LOG_FORMAT = 'pretty'
    vi.resetModules()

    // Act
    const { logger } = await import('@defra/lis-hubs-infra-core')
    await import('./server.js')

    // Assert
    expect(logger.format).toBe('pretty-print')
  })

  test('server.js passes any other LOG_FORMAT value through to the logger unchanged', async () => {
    // Arrange
    process.env.LOG_FORMAT = 'ecs'
    vi.resetModules()

    // Act
    const { logger } = await import('@defra/lis-hubs-infra-core')
    await import('./server.js')

    // Assert
    expect(logger.format).toBe('ecs')
  })
})
