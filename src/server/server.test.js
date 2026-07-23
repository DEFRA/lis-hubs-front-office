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
        animalsOnHolding: [
          [
            { text: 'UK 123456 100001' },
            { text: '15 January 2024' },
            { text: '18 January 2024' },
            { text: 'Female' },
            { text: 'Holstein Friesian' },
            {
              html: '<strong class="govuk-tag govuk-tag--green">Valid</strong>'
            }
          ]
        ],
        animalErrors: [
          {
            earTag: 'UK 123456 100005',
            summaryRows: [
              {
                key: { text: 'Date of birth' },
                value: { text: '27 March 2024' }
              },
              {
                key: { text: 'Date of registration' },
                value: { text: '2 April 2024' }
              },
              {
                key: { text: 'Reason for error' },
                value: {
                  text: 'Ear tag number does not match the number recorded at birth notification.'
                }
              }
            ]
          }
        ],
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
    expect(result).toContain('UK 123456 100001')
    expect(result).toContain('15 January 2024')
    expect(result).toContain('Holstein Friesian')
    expect(result).toContain('Status')
    expect(result).toContain('govuk-tag--green')
    expect(result).toContain('Valid')
    expect(result).toContain('UK 123456 100005')
    expect(result).toContain('Date of registration')
    expect(result).toContain(
      'Ear tag number does not match the number recorded at birth notification.'
    )
    expect(result).toContain('How to rectify animal error records')
    expect(result).toContain('class="govuk-inset-text app-inset-text--flush"')
  })
})
