import { describe, expect, test, vi } from 'vitest'

vi.mock('@defra/lis-hubs-infra-registry', () => ({
  getBasePathForModule: () => '/cattle'
}))

import { toCattleSection } from './cattle.js'

describe('toCattleSection()', () => {
  test('builds the cattle cards, services and help, linking only the cattle-on-holding card', () => {
    // Arrange
    const summary = {
      cph: '12/345/0001',
      cattle: { on_holding: 18, in_progress: 4, with_errors: 2 }
    }

    // Act
    const result = toCattleSection(summary)

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
    const result = toCattleSection(summary)

    // Assert
    expect(result.cards.map((card) => card.count)).toEqual([0, 0, 0])
  })
})
