import { afterEach, describe, expect, test, vi } from 'vitest'

import { cattleHomeBe4FeClient } from '#server/common/helpers/cattle-home-be4fe-client.js'

vi.mock('#server/common/helpers/cattle-home-be4fe-client.js', () => ({
  cattleHomeBe4FeClient: {
    getUserDetails: vi.fn(),
    getCattleOnHolding: vi.fn(),
    createUser: vi.fn()
  }
}))
vi.mock('./view-model.js', () => ({
  toHoldingOverviewViewModel: (summary, user) => ({ mapped: summary, user })
}))

import { demandHoldingAccess, holdingOverviewController } from './controller.js'

const mocks = {
  getUserDetails: vi.mocked(cattleHomeBe4FeClient.getUserDetails),
  getCattleOnHolding: vi.mocked(cattleHomeBe4FeClient.getCattleOnHolding)
}

function requestFor(cph, cphsGranted = [cph]) {
  return {
    params: { cph },
    auth: {
      credentials: {
        user: {
          sub: 'user-1',
          statements: [
            {
              role: 'lis-role-cattle-read',
              cphs: cphsGranted,
              permissions: ['lis-perm-cattle-read']
            }
          ]
        }
      }
    }
  }
}

describe('demandHoldingAccess()', () => {
  const h = { continue: Symbol('continue') }

  test('continues when the user may read cattle on the CPH', () => {
    // Act
    const result = demandHoldingAccess(requestFor('12/345/0001'), h)

    // Assert
    expect(result).toBe(h.continue)
  })

  test('returns not found when the user has no cattle read on the CPH', () => {
    // Act
    const result = demandHoldingAccess(
      requestFor('12/345/0001', ['24/118/0042']),
      h
    )

    // Assert
    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(404)
  })

  test('returns not found for a CPH that is not county/parish/holding', () => {
    // Act
    const result = demandHoldingAccess(requestFor('12/345', ['12/345']), h)

    // Assert
    expect(result.output.statusCode).toBe(404)
  })
})

describe('holdingOverviewController', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  const noCattle = { on_holding: 0, in_progress: 0, with_errors: 0 }

  test('composes the overview from the matching CPH and the cattle on it', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')
    mocks.getUserDetails.mockResolvedValueOnce({
      subject: 'user-1',
      cphs: [
        { cph: '24/118/0042', holding_name: 'Other Farm' },
        { cph: '12/345/0001', holding_name: 'Oakfield Farm' }
      ]
    })
    mocks.getCattleOnHolding.mockResolvedValueOnce([
      { cattle_id: 'UK1', eartag: 'UK1' },
      { cattle_id: 'UK2', eartag: 'UK2' }
    ])

    // Act
    const response = await holdingOverviewController.handler(
      requestFor('12/345/0001'),
      { view }
    )

    // Assert
    expect(response).toBe('rendered')
    expect(mocks.getUserDetails).toHaveBeenCalledWith('user-1')
    expect(mocks.getCattleOnHolding).toHaveBeenCalledWith('12/345/0001')
    expect(view).toHaveBeenCalledWith('holdings/overview/overview', {
      mapped: {
        cph: '12/345/0001',
        name: 'Oakfield Farm',
        cattle: { on_holding: 2, in_progress: 0, with_errors: 0 }
      },
      user: expect.objectContaining({ sub: 'user-1' })
    })
  })

  test('counts zero cattle when the BE4FE does not know the holding', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')
    mocks.getUserDetails.mockResolvedValueOnce({
      subject: 'user-1',
      cphs: [{ cph: '12/345/0001', holding_name: 'Oakfield Farm' }]
    })
    mocks.getCattleOnHolding.mockResolvedValueOnce(null)

    // Act
    await holdingOverviewController.handler(requestFor('12/345/0001'), { view })

    // Assert
    expect(view).toHaveBeenCalledWith('holdings/overview/overview', {
      mapped: { cph: '12/345/0001', name: 'Oakfield Farm', cattle: noCattle },
      user: expect.objectContaining({ sub: 'user-1' })
    })
  })

  test('uses a null name when the CPH is not in the user details', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')
    mocks.getUserDetails.mockResolvedValueOnce({
      subject: 'user-1',
      cphs: [{ cph: '24/118/0042', holding_name: 'Other Farm' }]
    })
    mocks.getCattleOnHolding.mockResolvedValueOnce([])

    // Act
    await holdingOverviewController.handler(requestFor('12/345/0001'), { view })

    // Assert
    expect(view).toHaveBeenCalledWith('holdings/overview/overview', {
      mapped: { cph: '12/345/0001', name: null, cattle: noCattle },
      user: expect.objectContaining({ sub: 'user-1' })
    })
  })

  test('uses a null name when the BE4FE does not know the user', async () => {
    // Arrange
    const view = vi.fn(() => 'rendered')
    mocks.getUserDetails.mockResolvedValueOnce(null)
    mocks.getCattleOnHolding.mockResolvedValueOnce([])

    // Act
    await holdingOverviewController.handler(requestFor('12/345/0001'), { view })

    // Assert
    expect(view).toHaveBeenCalledWith('holdings/overview/overview', {
      mapped: { cph: '12/345/0001', name: null, cattle: noCattle },
      user: expect.objectContaining({ sub: 'user-1' })
    })
  })

  test('propagates a BE4FE failure', async () => {
    // Arrange
    mocks.getUserDetails.mockRejectedValueOnce(new Error('be4fe unavailable'))
    mocks.getCattleOnHolding.mockResolvedValueOnce([])

    // Act
    let error
    try {
      await holdingOverviewController.handler(requestFor('12/345/0001'), {
        view: vi.fn()
      })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toEqual(new Error('be4fe unavailable'))
  })
})
