import { describe, expect, test, vi } from 'vitest'

const { Tabs, createAll } = vi.hoisted(() => ({
  Tabs: class {},
  createAll: vi.fn()
}))

vi.mock('govuk-frontend', () => ({ Tabs, createAll }))

describe('browser application bootstrap', () => {
  test('initialises the GOV.UK tabs component', async () => {
    await import('./application.js')

    expect(createAll).toHaveBeenCalledWith(Tabs)
  })
})
