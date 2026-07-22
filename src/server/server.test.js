import { afterAll, beforeAll, describe, expect, test } from 'vitest'

describe('#frontOfficeServer', () => {
  const originalLogFormat = process.env.LOG_FORMAT
  let createServer
  let server

  beforeAll(async () => {
    process.env.LOG_FORMAT = 'pino-pretty'
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

  test('Should render the holding landing page', async () => {
    const result = await server.render('home/summary', {
      pageTitle: 'Your holding',
      authenticatedUser: { firstName: 'Test', lastName: 'User' },
      dashboardMessages: [],
      activeHolding: {
        id: '10/081/1234',
        name: 'My farm',
        animalsUrl: '/cattle/home?cph=10%2F081%2F1234',
        errorsUrl: '/cattle/errors',
        summaryRows: [
          { key: { text: 'CPH number' }, value: { text: '10/081/1234' } },
          { key: { text: 'Holding name' }, value: { text: 'My farm' } },
          {
            key: { text: 'Business name' },
            value: { text: 'My Livestock Ltd' }
          },
          { key: { text: 'Holding type' }, value: { text: 'Permanent' } },
          { key: { text: 'Registered keeper' }, value: { text: 'Test User' } },
          { key: { text: 'Herd mark' }, value: { text: 'UK 123456' } }
        ]
      },
      logoutUrl: '/auth/logout'
    })

    expect(result).toContain('My farm')
    expect(result).toContain('CPH number:')
    expect(result).toContain(
      'href="/cattle/home?cph=10%2F081%2F1234">10/081/1234</a>'
    )
    expect(result).toContain('Holding details')
    expect(result).toContain('Animals on holding')
    expect(result).toContain('Animal error record')
    expect(result).toContain('My Livestock Ltd')
    expect(result).toContain('UK 123456')
  })
})
