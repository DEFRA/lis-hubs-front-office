/** @import { Server } from '@hapi/hapi' */
import { createServer } from '#server/server.js'
import { config } from '#config/config.js'
import { logger } from '@defra/lis-hubs-infra-core'

/**
 * @returns {Promise<Server>}
 */
export async function startServer() {
  const server = await createServer()

  await server.start()

  logger.info('Server started successfully')
  logger.info(
    `Access the front office on http://localhost:${config.get('port')}`
  )

  return server
}
