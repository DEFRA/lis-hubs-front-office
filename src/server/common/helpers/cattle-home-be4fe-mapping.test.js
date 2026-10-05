import { describe, expect, test } from 'vitest'

import { toHoldingsFromUserCphs } from './cattle-home-be4fe-mapping.js'

describe('toHoldingsFromUserCphs()', () => {
  test('maps BE4FE CPHs onto the hub holdings shape', () => {
    // Arrange
    const cphs = [
      {
        cph: '12/345/0001',
        holding_id: 'holding-1',
        holding_name: 'Oakfield Farm',
        role: 'Owner'
      }
    ]

    // Act
    const result = toHoldingsFromUserCphs(cphs)

    // Assert
    expect(result).toEqual([
      {
        countyParishHoldingId: 'holding-1',
        countyParishHoldingNumber: '12/345/0001',
        holdingName: 'Oakfield Farm',
        roleName: 'Owner'
      }
    ])
  })

  test('preserves null and missing optional fields', () => {
    // Arrange
    const cphs = [
      { cph: '12/345/0001', holding_id: null, holding_name: null, role: null },
      { cph: '24/118/0042' }
    ]

    // Act
    const result = toHoldingsFromUserCphs(cphs)

    // Assert
    expect(result).toEqual([
      {
        countyParishHoldingId: null,
        countyParishHoldingNumber: '12/345/0001',
        holdingName: null,
        roleName: null
      },
      {
        countyParishHoldingId: undefined,
        countyParishHoldingNumber: '24/118/0042',
        holdingName: undefined,
        roleName: undefined
      }
    ])
  })

  test('returns an empty array when no CPHs are given', () => {
    // Arrange
    const cphs = undefined

    // Act
    const result = toHoldingsFromUserCphs(cphs)

    // Assert
    expect(result).toEqual([])
  })
})
