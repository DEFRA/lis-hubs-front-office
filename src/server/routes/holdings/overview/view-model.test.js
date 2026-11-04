import { describe, expect, test, vi } from 'vitest'

vi.mock('./cards/index.js', () => ({
  speciesCards: [
    {
      permission: 'lis-perm-cattle-read',
      toSection: (summary, user) => ({ code: 'ctt', from: summary, user })
    },
    {
      permission: 'lis-perm-sheep-read',
      toSection: (summary, user) => ({ code: 'shp', from: summary, user })
    }
  ]
}))

import { toHoldingOverviewViewModel } from './view-model.js'

function userWith(permissions, cphs = ['12/345/0001']) {
  return { statements: [{ role: 'r', cphs, permissions }] }
}

describe('toHoldingOverviewViewModel()', () => {
  test('maps the summary onto the overview page', () => {
    // Arrange
    const summary = {
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      cattle: { on_holding: 18, in_progress: 4, with_errors: 2 }
    }

    // Act
    const result = toHoldingOverviewViewModel(
      summary,
      userWith(['lis-perm-cattle-read'])
    )

    // Assert
    expect(result).toEqual({
      pageTitle: 'Oakfield Farm',
      holdingName: 'Oakfield Farm',
      cph: '12/345/0001',
      tabs: [{ text: 'Overview', href: '/holdings/12/345/0001', active: true }],
      speciesSections: [
        { code: 'ctt', from: summary, user: userWith(['lis-perm-cattle-read']) }
      ]
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
    const result = toHoldingOverviewViewModel(
      summary,
      userWith(['lis-perm-cattle-read'])
    )

    // Assert
    expect(result.pageTitle).toBe('12/345/0001')
    expect(result.holdingName).toBeNull()
    expect(result.speciesSections).toEqual([
      { code: 'ctt', from: summary, user: userWith(['lis-perm-cattle-read']) }
    ])
  })

  test('shows a section for each species the user may read on the holding', () => {
    // Arrange
    const summary = {
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      cattle: { on_holding: 1, in_progress: 0, with_errors: 0 }
    }

    // Act
    const result = toHoldingOverviewViewModel(
      summary,
      userWith(['lis-perm-cattle-read', 'lis-perm-sheep-read'])
    )

    // Assert
    expect(result.speciesSections.map((section) => section.code)).toEqual([
      'ctt',
      'shp'
    ])
  })

  test('leaves out a species the user may only read on another holding', () => {
    // Arrange
    const summary = {
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      cattle: { on_holding: 1, in_progress: 0, with_errors: 0 }
    }
    const user = {
      statements: [
        {
          role: 'r',
          cphs: ['12/345/0001'],
          permissions: ['lis-perm-cattle-read']
        },
        {
          role: 'r',
          cphs: ['24/118/0042'],
          permissions: ['lis-perm-sheep-read']
        }
      ]
    }

    // Act
    const result = toHoldingOverviewViewModel(summary, user)

    // Assert
    expect(result.speciesSections.map((section) => section.code)).toEqual([
      'ctt'
    ])
  })
})
