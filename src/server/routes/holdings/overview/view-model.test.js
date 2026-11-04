import { describe, expect, test, vi } from 'vitest'

vi.mock('./cards/cattle.js', () => ({
  toCattleSection: (summary) => ({ code: 'ctt', from: summary })
}))

import { toHoldingOverviewViewModel } from './view-model.js'

describe('toHoldingOverviewViewModel()', () => {
  test('maps the summary onto the overview page', () => {
    // Arrange
    const summary = {
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      cattle: { on_holding: 18, in_progress: 4, with_errors: 2 }
    }

    // Act
    const result = toHoldingOverviewViewModel(summary)

    // Assert
    expect(result).toEqual({
      pageTitle: 'Oakfield Farm',
      holdingName: 'Oakfield Farm',
      cph: '12/345/0001',
      tabs: [{ text: 'Overview', href: '/holdings/12/345/0001', active: true }],
      speciesSections: [{ code: 'ctt', from: summary }]
    })
  })

  test('falls back to the CPH as the title when the holding has no name', () => {
    // Arrange
    const summary = {
      cph: '12/345/0001',
      name: null,
      cattle: { on_holding: 0, in_progress: 0, with_errors: 0 }
    }

    // Act
    const result = toHoldingOverviewViewModel(summary)

    // Assert
    expect(result.pageTitle).toBe('12/345/0001')
    expect(result.holdingName).toBeNull()
    expect(result.speciesSections).toEqual([{ code: 'ctt', from: summary }])
  })
})
