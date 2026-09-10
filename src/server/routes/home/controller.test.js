import { describe, expect, test, vi } from 'vitest'

const { moduleDefinitions, speciesDefinitions } = vi.hoisted(() => ({
  moduleDefinitions: [{ id: 'cattle-home' }, { id: 'sheep-home' }],
  speciesDefinitions: [
    { code: 'ctt', label: 'Cattle' },
    { code: 'shp', label: 'Sheep' }
  ]
}))

vi.mock('@defra/lis-hubs-infra-registry', () => ({
  MODULES: moduleDefinitions,
  SPECIES: speciesDefinitions
}))

import { homeController } from './controller.js'

describe('#frontOfficeHomeController', () => {
  test('Should render the welcome view for unauthenticated users', () => {
    // Arrange
    const view = vi.fn(() => 'rendered')

    // Act
    const response = homeController.handler({}, { view })

    // Assert
    expect(response).toBe('rendered')
    expect(view).toHaveBeenCalledWith(
      'home/welcome',
      expect.objectContaining({
        pageTitle: 'Welcome',
        heading: 'Livestock Information',
        loginUrl: '/auth/login?returnUrl=/',
        supportedSpecies: speciesDefinitions,
        supportedSpokes: moduleDefinitions
      })
    )
  })

  test('Should render the species selector for authenticated users', () => {
    // Arrange
    const view = vi.fn(() => 'rendered')
    const request = { app: { hubAuth: { sub: 'user-1' } } }

    // Act
    const response = homeController.handler(request, { view })

    // Assert
    expect(response).toBe('rendered')
    expect(view).toHaveBeenCalledWith('home/species', {
      pageTitle: 'Choose a species',
      speciesOptions: [
        expect.objectContaining({ label: 'Cattle', href: '/cattle' }),
        expect.objectContaining({ label: 'Sheep' }),
        expect.objectContaining({ label: 'Chicken' })
      ]
    })
  })

  test('Should only wire up the Cattle option', () => {
    // Arrange
    const view = vi.fn()
    const request = { app: { hubAuth: { sub: 'user-1' } } }

    // Act
    homeController.handler(request, { view })

    // Assert
    const { speciesOptions } = view.mock.calls[0][1]
    const linked = speciesOptions.filter((option) => option.href)
    expect(linked).toEqual([
      expect.objectContaining({ label: 'Cattle', href: '/cattle' })
    ])
  })
})
