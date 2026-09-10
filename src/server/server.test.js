import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'

describe('#frontOfficeServer', () => {
  const originalLogFormat = process.env.LOG_FORMAT
  let createServer
  let server

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

  test('Should render the species selector', async () => {
    const result = await server.render('home/species', {
      pageTitle: 'Choose a species',
      speciesOptions: [
        { label: 'Cattle', description: 'Manage cattle.', href: '/cattle' },
        { label: 'Sheep', description: 'Not yet available in this service.' }
      ]
    })

    expect(result).toContain('Choose a species')
    expect(result).toContain('href="/cattle">Cattle</a>')
    expect(result).toContain('Sheep')
    expect(result).toContain('govuk-secondary-text-colour')
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
