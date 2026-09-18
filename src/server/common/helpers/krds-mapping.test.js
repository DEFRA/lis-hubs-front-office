import { describe, expect, test } from 'vitest'
import { toHoldings } from './krds-mapping.js'

describe('toHoldings()', () => {
  test('it maps a CphAssociationDto onto the countyParishHoldingNumber shape', () => {
    // Arrange
    const cphAssociations = [
      {
        id: 'association-1',
        cphNumber: '12/345/6789',
        role: 'Keeper',
        partyId: null,
        holdingId: 'holding-1',
        holdingName: 'Oakfield Farm'
      }
    ]

    // Act
    const holdings = toHoldings(cphAssociations)

    // Assert
    expect(holdings).toEqual([
      {
        id: 'association-1',
        partyId: null,
        countyParishHoldingId: 'holding-1',
        countyParishHoldingNumber: '12/345/6789',
        holdingName: 'Oakfield Farm',
        roleName: 'Keeper'
      }
    ])
  })

  test('it returns an empty array when no CPH associations are supplied', () => {
    // Arrange
    // (no arrangement needed)

    // Act
    const holdings = toHoldings()

    // Assert
    expect(holdings).toEqual([])
  })
})
