import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { config } from '#config/config.js'

describe('#frontOfficeServer', () => {
  const originalLogFormat = process.env.LOG_FORMAT
  let createServer
  let server

  afterEach(() => {
    vi.restoreAllMocks()
    config.set('maintenance.availableFrom', '')
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

  test('Should render the page not found page for an unknown path', async () => {
    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/no-such-page'
    })

    // Assert
    expect(response.statusCode).toBe(404)
    expect(response.result).toContain('Page not found')
    expect(response.result).toContain(
      'If you typed the web address, check it is correct.'
    )
  })

  test('Should answer with the service unavailable page while maintenance is set', async () => {
    // Arrange
    config.set('maintenance.availableFrom', '2026-11-19T09:00')
    const maintenanceServer = await createServer()
    await maintenanceServer.initialize()

    // Act
    const response = await maintenanceServer.inject({
      method: 'GET',
      url: '/'
    })
    await maintenanceServer.stop({ timeout: 0 })

    // Assert
    expect(response.statusCode).toBe(503)
    expect(response.result).toContain('Sorry, the service is unavailable')
    expect(response.headers['retry-after']).toBeDefined()
  })

  test('Should keep the health check up while maintenance is set', async () => {
    // Arrange
    config.set('maintenance.availableFrom', '2026-11-19T09:00')
    const maintenanceServer = await createServer()
    await maintenanceServer.initialize()

    // Act
    const response = await maintenanceServer.inject({
      method: 'GET',
      url: '/health'
    })
    await maintenanceServer.stop({ timeout: 0 })

    // Assert
    expect(response.statusCode).toBe(200)
  })

  test('Should serve the service as normal when maintenance is not set', async () => {
    // Arrange
    config.set('maintenance.availableFrom', '')
    const normalServer = await createServer()
    await normalServer.initialize()

    // Act
    const response = await normalServer.inject({
      method: 'GET',
      url: '/'
    })
    await normalServer.stop({ timeout: 0 })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('Livestock Information')
    expect(response.result).not.toContain('Sorry, the service is unavailable')
    expect(response.headers['retry-after']).toBeUndefined()
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
      '<div class="lis-sortable-table__wrapper" data-module="lis-scrollable-table" tabindex="0" role="region" aria-label="My holdings table">'
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

  test('Should render the CPH as a row header in the holdings table', async () => {
    // Arrange
    const context = {
      pageTitle: 'My holdings',
      holdings: [
        {
          countyParishHoldingNumber: '12/345/0001',
          holdingName: 'Oakfield Farm',
          roleName: 'Owner'
        }
      ]
    }

    // Act
    const result = await server.render('home/holdings', context)

    // Assert
    expect(result).toContain('<th scope="row"')
  })

  test('Should render the related content landmark on the welcome page', async () => {
    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/'
    })

    // Assert
    expect(response.result).toContain(
      '<aside aria-labelledby="related-content-title">'
    )
    expect(response.result).toMatch(/<h2 [^>]*id="related-content-title"/)
  })

  test('Should capitalise the KRDS role in the holdings table', async () => {
    // Arrange
    const context = {
      pageTitle: 'My holdings',
      holdings: [
        {
          countyParishHoldingNumber: '12/345/0001',
          holdingName: 'Oakfield Farm',
          roleName: 'owner'
        }
      ]
    }

    // Act
    const result = await server.render('home/holdings', context)

    // Assert
    expect(result).toContain('<td class="govuk-table__cell">Owner</td>')
    expect(result).not.toContain('<td class="govuk-table__cell">owner</td>')
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
