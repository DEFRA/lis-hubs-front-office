import { describe, expect, test } from 'vitest'
import { toHoldingRoles, toHoldings } from './krds-mapping.js'

describe('toHoldings()', () => {
  test('it maps a CphAssociationDto onto the countyParishHoldingNumber shape', () => {
    // Arrange
    const cphAssociations = [
      {
        id: 'association-1',
        cphNumber: '12/345/6789',
        role: 'owner',
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
        roleName: 'owner'
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

describe('toHoldingRoles()', () => {
  test('it maps each CPH association onto a role grant scoped to that CPH', () => {
    // Arrange
    const cphAssociations = [
      {
        id: 'association-1',
        cphNumber: '12/345/6789',
        role: 'owner',
        partyId: null,
        holdingId: 'holding-1',
        holdingName: 'Oakfield Farm'
      },
      {
        id: 'association-2',
        cphNumber: '98/765/4321',
        role: 'keeper',
        partyId: null,
        holdingId: null,
        holdingName: null
      }
    ]

    // Act
    const holdingRoles = toHoldingRoles(cphAssociations)

    // Assert
    expect(holdingRoles).toEqual([
      { role: 'owner', cph: '12/345/6789' },
      { role: 'keeper', cph: '98/765/4321' }
    ])
  })

  test('it returns an empty array when no CPH associations are supplied', () => {
    // Arrange
    // (no arrangement needed)

    // Act
    const holdingRoles = toHoldingRoles()

    // Assert
    expect(holdingRoles).toEqual([])
  })
})
