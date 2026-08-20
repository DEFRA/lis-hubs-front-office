import { beforeEach, describe, expect, test, vi } from 'vitest'

const { configGet, getModulesForHub } = vi.hoisted(() => ({
  configGet: vi.fn(),
  getModulesForHub: vi.fn(() => [
    { id: 'cattle-home', path: '/cattle/home', port: 3221 }
  ])
}))

vi.mock('@defra/lis-hubs-infra-registry', () => ({ getModulesForHub }))
vi.mock('#config/config.js', () => ({ config: { get: configGet } }))

import { proxy } from './index.js'

describe('#proxy', () => {
  beforeEach(() => vi.clearAllMocks())

  test.each([
    // Local proxying intentionally uses HTTP because the services run locally.
    ['local', 'http://localhost:3221'],
    // eslint-disable-next-line sonarjs/no-clear-text-protocols
    ['docker_compose', 'http://cattle-home:3221'],
    ['test', 'https://lis-apps-cattle-home.test.cdp-int.defra.cloud'],
    ['prod', 'https://lis-apps-cattle-home.prod.cdp-int.defra.cloud']
  ])('Should register the %s proxy target', (environment, expectedBaseUri) => {
    configGet.mockReturnValue(environment)
    const server = { route: vi.fn() }

    proxy.plugin.register(server)

    expect(getModulesForHub).toHaveBeenCalledWith('front-office')
    const route = server.route.mock.calls[0][0]
    expect(route).toMatchObject({ method: '*', path: '/cattle/home/{path*}' })
    expect(
      route.handler.proxy.mapUri({
        params: { path: 'summary-data' },
        headers: { cookie: 'session=abc' }
      })
    ).toEqual({
      uri: `${expectedBaseUri}/summary-data`,
      headers: {
        'x-forwarded-prefix': '/cattle/home',
        cookie: 'session=abc'
      }
    })
    expect(route.handler.proxy.mapUri({ params: {}, headers: {} })).toEqual({
      uri: expectedBaseUri,
      headers: { 'x-forwarded-prefix': '/cattle/home' }
    })
  })

  test('Should reject an unsupported environment', () => {
    configGet.mockReturnValue('unknown')

    expect(() => proxy.plugin.register({ route: vi.fn() })).toThrow(
      'Unhandled environment: unknown'
    )
  })
})
