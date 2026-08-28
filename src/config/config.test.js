import { afterEach, describe, expect, test, vi } from 'vitest'

describe('configuration environment defaults', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('uses production-safe defaults in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.LOG_FORMAT
    vi.resetModules()

    const { config } = await import('./config.js')

    expect(config.get('log.format')).toBe('ecs')
  })
})
