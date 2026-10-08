import { beforeEach, describe, expect, test, vi } from 'vitest'

const { configGet } = vi.hoisted(() => ({ configGet: vi.fn() }))

vi.mock('#config/config.js', () => ({
  config: { get: configGet }
}))

import { isAllowListed } from './allow-list.js'

function givenAllowList({ enabled, emails = [] }) {
  const values = {
    'auth.allowList.enabled': enabled,
    'auth.allowList.emails': emails
  }
  configGet.mockImplementation((path) => values[path])
}

describe('#isAllowListed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should allow everyone when the allow-list is disabled', () => {
    givenAllowList({ enabled: false })

    expect(isAllowListed('anyone@example.com')).toBe(true)
  })

  test('Should allow a listed email regardless of case and whitespace', () => {
    givenAllowList({ enabled: true, emails: [' Keeper@Example.com '] })

    expect(isAllowListed('keeper@example.COM')).toBe(true)
  })

  test('Should refuse an email that is not listed', () => {
    givenAllowList({ enabled: true, emails: ['keeper@example.com'] })

    expect(isAllowListed('someone.else@example.com')).toBe(false)
  })

  test('Should refuse a user without an email', () => {
    givenAllowList({ enabled: true, emails: ['', 'keeper@example.com'] })

    expect(isAllowListed(undefined)).toBe(false)
    expect(isAllowListed('')).toBe(false)
  })
})
