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

  test('Should render the farm and species dashboard', async () => {
    const result = await server.render('home/summary', {
      authenticatedUser: { firstName: 'Test', lastName: 'User' },
      dashboardMessages: [],
      farms: [
        {
          name: 'My farm',
          cphs: [
            {
              id: '10/081/1234',
              postcode: 'MK11 1AA',
              species: [
                {
                  id: 'cattle',
                  label: 'Cattle',
                  count: 7,
                  url: '/cattle/home'
                }
              ]
            }
          ]
        }
      ],
      logoutUrl: '/auth/logout'
    })

    expect(result).toContain('Welcome back')
    expect(result).toContain('You have no outstanding actions')
    expect(result).toContain('My farm')
    expect(result).toContain('CPH 10/081/1234')
    expect(result).toContain('7 animals')
  })
})
