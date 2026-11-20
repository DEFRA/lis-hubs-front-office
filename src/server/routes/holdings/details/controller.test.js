import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

import { getHoldingDetails } from '#server/common/helpers/cattle-home-be4fe-client.js'
import { holdingDetailsController } from './controller.js'
import { toHoldingDetailsViewModel } from './view-model.js'

vi.mock('#server/common/helpers/cattle-home-be4fe-client.js')
vi.mock('./view-model.js')

const mocks = {
  getHoldingDetails: vi.mocked(getHoldingDetails),
  toHoldingDetailsViewModel: vi.mocked(toHoldingDetailsViewModel)
}

describe('holdingDetailsController.handler()', () => {
  beforeAll(() => {
    mocks.toHoldingDetailsViewModel.mockReturnValue({ mapped: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('renders the view with the mapped holding', async () => {
    // Arrange
    const holding = { cph: '12/345/0001', name: 'Oakfield Farm' }
    const view = vi.fn(() => 'rendered')
    mocks.getHoldingDetails.mockResolvedValueOnce(holding)

    // Act
    const response = await holdingDetailsController.handler(
      { params: { cph: '12/345/0001' } },
      { view }
    )

    // Assert
    expect(response).toBe('rendered')
    expect(mocks.getHoldingDetails).toHaveBeenCalledWith('12/345/0001')
    expect(mocks.toHoldingDetailsViewModel).toHaveBeenCalledWith(
      '12/345/0001',
      holding
    )
    expect(view).toHaveBeenCalledWith('holdings/details/details', {
      mapped: true
    })
  })

  test('throws not found when the BE4FE does not know the holding', async () => {
    // Arrange
    const view = vi.fn()
    mocks.getHoldingDetails.mockResolvedValueOnce(null)

    // Act
    let error
    try {
      await holdingDetailsController.handler(
        { params: { cph: '12/345/0001' } },
        { view }
      )
    } catch (e) {
      error = e
    }

    // Assert
    expect(error.isBoom).toBe(true)
    expect(error.output.statusCode).toBe(404)
    expect(view).not.toHaveBeenCalled()
  })

  test('propagates a BE4FE failure', async () => {
    // Arrange
    mocks.getHoldingDetails.mockRejectedValueOnce(
      new Error('be4fe unavailable')
    )

    // Act
    let error
    try {
      await holdingDetailsController.handler(
        { params: { cph: '12/345/0001' } },
        { view: vi.fn() }
      )
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toEqual(new Error('be4fe unavailable'))
  })
})
