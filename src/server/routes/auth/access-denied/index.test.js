import { describe, expect, test } from 'vitest'

import { createServer } from '#server/server.js'

describe('#accessDenied', () => {
  test('Should show the no-access page without needing a session', async () => {
    const server = await createServer()
    await server.initialize()

    const response = await server.inject({
      method: 'GET',
      url: '/auth/access-denied'
    })

    await server.stop({ timeout: 0 })

    expect(response.statusCode).toBe(403)
    expect(response.result).toContain('You cannot use this service yet')
  })
})
