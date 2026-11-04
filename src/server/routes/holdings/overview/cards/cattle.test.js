import { describe, expect, test, vi } from 'vitest'

vi.mock('@defra/lis-hubs-infra-registry', () => ({
  getBasePathForModule: () => '/cattle'
}))

import { toCattleSection } from './cattle.js'

function userWith(permissions, cphs = ['12/345/0001']) {
  return { statements: [{ role: 'r', cphs, permissions }] }
}

const allServices = [
  'lis-perm-cattle-register-write',
  'lis-perm-cattle-move-write',
  'lis-perm-cattle-death-write'
]

describe('toCattleSection()', () => {
  test('builds the cattle cards, every service the user may use, and help, linking only the cattle-on-holding card', () => {
    // Arrange
    const summary = {
      cph: '12/345/0001',
      cattle: { on_holding: 18, in_progress: 4, with_errors: 2 }
    }

    // Act
    const result = toCattleSection(summary, userWith(allServices))

    // Assert
    expect(result).toEqual({
      code: 'ctt',
      label: 'Cattle',
      cards: [
        {
          label: 'Cattle on holding',
          count: 18,
          status: 'green',
          href: '/cattle/holdings/12/345/0001/animals'
        },
        { label: 'In progress', count: 4, status: 'amber' },
        { label: 'Cattle with errors', count: 2, status: 'red' }
      ],
      services: [
        { text: 'Register a cattle birth', href: '/cattle' },
        { text: 'Report a cattle movement', href: '/cattle' },
        { text: 'Report a cattle death', href: '/cattle' }
      ],
      help: [
        {
          text: 'GOV.UK guidance for cattle',
          href: 'https://www.gov.uk/government/collections/keeping-cattle-bison-and-buffalo-in-england-and-wales'
        },
        {
          text: 'Contact BCMS',
          href: 'https://www.gov.uk/government/organisations/british-cattle-movement-service'
        }
      ]
    })
  })

  test('shows zero counts as zero', () => {
    // Arrange
    const summary = {
      cph: '12/345/0001',
      cattle: { on_holding: 0, in_progress: 0, with_errors: 0 }
    }

    // Act
    const result = toCattleSection(summary, userWith(allServices))

    // Assert
    expect(result.cards.map((card) => card.count)).toEqual([0, 0, 0])
  })

  test('lists only the services the user may use on the holding', () => {
    // Arrange
    const summary = {
      cph: '12/345/0001',
      cattle: { on_holding: 1, in_progress: 0, with_errors: 0 }
    }

    // Act
    const result = toCattleSection(
      summary,
      userWith(['lis-perm-cattle-read', 'lis-perm-cattle-register-write'])
    )

    // Assert
    expect(result.services).toEqual([
      { text: 'Register a cattle birth', href: '/cattle' }
    ])
  })

  test('lists no services when the user may only use them on another holding', () => {
    // Arrange
    const summary = {
      cph: '12/345/0001',
      cattle: { on_holding: 1, in_progress: 0, with_errors: 0 }
    }

    // Act
    const result = toCattleSection(
      summary,
      userWith(allServices, ['24/118/0042'])
    )

    // Assert
    expect(result.services).toEqual([])
  })
})
