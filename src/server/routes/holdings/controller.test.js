import { describe, expect, test, vi } from 'vitest'

import { cphFromParams, holdingDetailsController } from './controller.js'

describe('#cphFromParams', () => {
  test('Should build a CPH from complete route parameters', () => {
    expect(
      cphFromParams({ county: '12', parish: '345', holding: '0001' })
    ).toBe('12/345/0001')
  })

  test.each([undefined, {}, { county: '12', parish: '345' }])(
    'Should return null for incomplete parameters',
    (params) => {
      expect(cphFromParams(params)).toBeNull()
    }
  )
})

describe('#holdingDetailsController', () => {
  test('Should redirect unauthenticated users back through login', () => {
    const redirect = vi.fn(() => 'redirected')

    expect(
      holdingDetailsController.handler(
        { app: {}, path: '/holdings/12/345/0001' },
        { redirect }
      )
    ).toBe('redirected')
    expect(redirect).toHaveBeenCalledWith(
      '/auth/login?returnUrl=/holdings/12/345/0001'
    )
  })

  test('Should render holding details for authenticated users', () => {
    const view = vi.fn(() => 'rendered')
    const path = '/holdings/12/345/0001'

    expect(
      holdingDetailsController.handler(
        { app: { hubAuth: { sub: 'user-1' } }, path },
        { view }
      )
    ).toBe('rendered')
    expect(view).toHaveBeenCalledWith(
      'holdings/details',
      expect.objectContaining({
        pageTitle: 'Holding details',
        holding: expect.objectContaining({ cphNumber: '12/345/0001' }),
        tabs: [{ text: 'Holding details', href: path, active: true }]
      })
    )
  })
})
