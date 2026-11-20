import { describe, expect, test } from 'vitest'

import { toHoldingDetailsViewModel } from './view-model.js'

describe('toHoldingDetailsViewModel()', () => {
  test('maps a full holding onto the page', () => {
    // Arrange
    const holding = {
      cph: '12/345/0001',
      name: 'Oakfield Farm',
      address: ['1 Farm Lane', '', 'Exeter', 'EX1 1AA'],
      correspondence_address: ['PO Box 1', 'Exeter'],
      herd_marks: [{ mark: 'AB1234', species: ['ctt'] }]
    }

    // Act
    const result = toHoldingDetailsViewModel('12/345/0001', holding)

    // Assert
    expect(result).toEqual({
      pageTitle: 'Holding details - Oakfield Farm',
      cph: '12/345/0001',
      holdingName: 'Oakfield Farm',
      tabs: [
        { text: 'Overview', href: '/holdings/12/345/0001' },
        {
          text: 'Holding details',
          href: '/holdings/12/345/0001/details',
          active: true
        }
      ],
      holdingRows: [
        { key: 'CPH number', text: '12/345/0001' },
        { key: 'Holding name', text: 'Oakfield Farm' },
        { key: 'Address', lines: ['1 Farm Lane', 'Exeter', 'EX1 1AA'] },
        { key: 'Herd mark', lines: ['AB1234'], emptyText: 'Not recorded' }
      ],
      correspondenceRows: [{ key: 'Address', lines: ['PO Box 1', 'Exeter'] }]
    })
  })

  test('falls back to the CPH when the holding has no name', () => {
    // Arrange
    const holding = {
      cph: '12/345/0001',
      name: null,
      address: [],
      correspondence_address: [],
      herd_marks: []
    }

    // Act
    const result = toHoldingDetailsViewModel('12/345/0001', holding)

    // Assert
    expect(result.pageTitle).toBe('Holding details - 12/345/0001')
    expect(result.holdingName).toBeNull()
    expect(result.holdingRows[1]).toEqual({ key: 'Holding name', text: null })
  })

  test('pluralises the herd mark key when there are several marks', () => {
    // Arrange
    const holding = {
      cph: '12/345/0001',
      address: [],
      correspondence_address: [],
      herd_marks: [
        { mark: 'AB1234', species: ['ctt'] },
        { mark: '', species: [] },
        { mark: 'CD5678', species: ['shp'] }
      ]
    }

    // Act
    const result = toHoldingDetailsViewModel('12/345/0001', holding)

    // Assert
    expect(result.holdingRows[3]).toEqual({
      key: 'Herd marks',
      lines: ['AB1234', 'CD5678'],
      emptyText: 'Not recorded'
    })
  })

  test('has no herd mark lines when there are no herd marks', () => {
    // Arrange
    const holding = {
      cph: '12/345/0001',
      address: [],
      correspondence_address: [],
      herd_marks: []
    }

    // Act
    const result = toHoldingDetailsViewModel('12/345/0001', holding)

    // Assert
    expect(result.holdingRows[3]).toEqual({
      key: 'Herd mark',
      lines: [],
      emptyText: 'Not recorded'
    })
  })

  test('has no correspondence lines when the address is empty', () => {
    // Arrange
    const holding = {
      cph: '12/345/0001',
      address: [],
      correspondence_address: [],
      herd_marks: []
    }

    // Act
    const result = toHoldingDetailsViewModel('12/345/0001', holding)

    // Assert
    expect(result.correspondenceRows).toEqual([{ key: 'Address', lines: [] }])
  })

  test('treats missing address, correspondence address and herd marks as empty', () => {
    // Arrange
    const holding = { cph: '12/345/0001', name: 'Oakfield Farm' }

    // Act
    const result = toHoldingDetailsViewModel('12/345/0001', holding)

    // Assert
    expect(result.holdingRows[2]).toEqual({ key: 'Address', lines: [] })
    expect(result.holdingRows[3].lines).toEqual([])
    expect(result.correspondenceRows).toEqual([{ key: 'Address', lines: [] }])
  })
})
