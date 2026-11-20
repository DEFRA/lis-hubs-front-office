import { HUB_AUTH_STRATEGY } from '@defra/lis-hubs-infra-access/authentication'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'

const { getUserDetails, getCattleOnHolding, getHoldingDetails } = vi.hoisted(
  () => ({
    getUserDetails: vi.fn(),
    getCattleOnHolding: vi.fn(),
    getHoldingDetails: vi.fn()
  })
)

vi.mock('#server/common/helpers/cattle-home-be4fe-client.js', () => ({
  getUserDetails,
  getCattleOnHolding,
  getHoldingDetails,
  createUser: vi.fn()
}))

import { createServer } from '#server/server.js'

function credentialsFor(cphs) {
  return {
    user: {
      sub: 'user-1',
      statements: [
        {
          role: 'lis-role-cattle-read',
          cphs,
          permissions: [
            'lis-perm-cattle-read',
            'lis-perm-cattle-register-write'
          ]
        }
      ]
    },
    authorizedSpecies: ['ctt'],
    refused: false
  }
}

describe('GET /holdings/{cph}', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('renders the holding overview for an entitled user', async () => {
    // Arrange
    getUserDetails.mockResolvedValueOnce({
      subject: 'user-1',
      cphs: [
        { cph: '12/345/0001', holding_name: 'Oakfield Farm', role: 'Owner' }
      ]
    })
    getCattleOnHolding.mockResolvedValueOnce([
      { cattle_id: 'UK1', eartag: 'UK1' },
      { cattle_id: 'UK2', eartag: 'UK2' },
      { cattle_id: 'UK3', eartag: 'UK3' }
    ])

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: credentialsFor(['12/345/0001'])
      }
    })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('>3<')
    expect(response.result).toContain('Oakfield Farm')
    expect(response.result).toContain('Cattle on holding')
    expect(response.result).toContain('href="/holdings/12/345/0001/cattle"')
    expect(response.result).toContain(
      'href="/holdings/12/345/0001/cattle/register"'
    )
    expect(response.result).not.toContain(
      'href="/holdings/12/345/0001/cattle/move"'
    )
    expect(response.result).toContain('up to 24 hours')
  })

  test('keeps the page, with a notice in place of the cattle cards, when the cattle on the holding cannot be read', async () => {
    // Arrange
    getUserDetails.mockResolvedValueOnce({
      subject: 'user-1',
      cphs: [
        { cph: '12/345/0001', holding_name: 'Oakfield Farm', role: 'Owner' }
      ]
    })
    getCattleOnHolding.mockRejectedValueOnce(new Error('be4fe unavailable'))

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: credentialsFor(['12/345/0001'])
      }
    })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('Oakfield Farm')
    expect(response.result).toContain(
      '<p class="govuk-body">Cattle information is currently unavailable. Refresh the page in your browser or try again later.</p>'
    )
    expect(response.result).not.toContain('Cattle on holding')
    expect(response.result).toContain(
      'href="/holdings/12/345/0001/cattle/register"'
    )
    expect(response.result).toContain('Contact BCMS')
  })

  test('returns 404 for a holding the user may not read', async () => {
    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: credentialsFor(['24/118/0042'])
      }
    })

    // Assert
    expect(response.statusCode).toBe(404)
    expect(getUserDetails).not.toHaveBeenCalled()
    expect(getCattleOnHolding).not.toHaveBeenCalled()
  })

  test('redirects an anonymous user to sign in', async () => {
    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001'
    })

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      '/auth/login?returnUrl=%2Fholdings%2F12%2F345%2F0001'
    )
  })
})

describe('GET /holdings/{cph}/details', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('renders the holding details for an entitled user', async () => {
    // Arrange
    getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      address: ['1 Farm Lane', 'Exeter'],
      correspondence_address: ['<script>alert(1)</script>'],
      herd_marks: [{ mark: 'AB1234', species: ['ctt'] }]
    })

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001/details',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: credentialsFor(['12/345/0001'])
      }
    })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(getHoldingDetails).toHaveBeenCalledWith('12/345/0001')
    expect(response.result).toContain('Oakfield Farm')
    expect(response.result).toContain('1 Farm Lane<br>Exeter')
    expect(response.result).toContain('AB1234')
    expect(response.result).toContain(
      '<h2 class="govuk-heading-m">Holding details</h2>'
    )
    expect(response.result).toContain(
      '<h2 class="govuk-heading-m">Correspondence details</h2>'
    )
    expect(response.result).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(response.result).not.toContain('<script>alert(1)</script>')
    expect(response.result).toMatch(
      /href="\/holdings\/12\/345\/0001\/details"[^>]*aria-current|aria-current[^>]*href="\/holdings\/12\/345\/0001\/details"/
    )
  })

  test('lists every herd mark on its own line when the holding has several', async () => {
    // Arrange
    getHoldingDetails.mockResolvedValueOnce({
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      address: ['1 Farm Lane', 'Exeter'],
      correspondence_address: [],
      herd_marks: [
        { mark: 'UK 111111', species: ['Cattle'] },
        { mark: 'UK 222222', species: ['Cattle'] },
        { mark: 'UK 333333', species: ['Cattle'] }
      ]
    })

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001/details',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: credentialsFor(['12/345/0001'])
      }
    })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.result).toMatch(
      /<dt class="govuk-summary-list__key">\s*Herd marks\s*<\/dt>/
    )
    expect(response.result).toContain('UK 111111<br>UK 222222<br>UK 333333')
  })

  test('returns 404 for a holding the user may not read', async () => {
    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001/details',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: credentialsFor(['24/118/0042'])
      }
    })

    // Assert
    expect(response.statusCode).toBe(404)
    expect(getHoldingDetails).not.toHaveBeenCalled()
  })

  test('returns 404 when the BE4FE does not know the holding', async () => {
    // Arrange
    getHoldingDetails.mockResolvedValueOnce(null)

    // Act
    const response = await server.inject({
      method: 'GET',
      url: '/holdings/12/345/0001/details',
      auth: {
        strategy: HUB_AUTH_STRATEGY,
        credentials: credentialsFor(['12/345/0001'])
      }
    })

    // Assert
    expect(response.statusCode).toBe(404)
  })
})
