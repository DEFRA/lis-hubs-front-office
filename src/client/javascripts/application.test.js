import { describe, expect, test, vi } from 'vitest'

const { Button, Tabs, createAll, LayoutOne, LayoutTwo, ScrollableTable } =
  vi.hoisted(() => ({
    Button: class {},
    Tabs: class {},
    createAll: vi.fn(),
    LayoutOne: class {},
    LayoutTwo: class {},
    ScrollableTable: class {}
  }))

vi.mock('govuk-frontend', () => ({ Button, Tabs, createAll }))
vi.mock('@defra/lis-infra-ui-services/components/layout', () => ({
  layoutComponents: [LayoutOne, LayoutTwo]
}))
vi.mock('@defra/lis-infra-ui-services/components/error-pages', () => ({
  errorPageComponents: [Button]
}))
vi.mock('@defra/lis-infra-ui-services/components/scrollable-table', () => ({
  ScrollableTable
}))

describe('browser application bootstrap', () => {
  test('starts each shared layout component, the error page button, the scrollable table and the GOV.UK tabs component, starting the button once', async () => {
    await import('./application.js')

    expect(createAll.mock.calls).toEqual([
      [LayoutOne],
      [LayoutTwo],
      [Button],
      [ScrollableTable],
      [Tabs]
    ])
  })
})
