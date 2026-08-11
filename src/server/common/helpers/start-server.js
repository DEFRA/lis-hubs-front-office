/** @import { Server } from '@hapi/hapi' */
import { createServer } from '#server/server.js'
import { config } from '#config/config.js'
import { getLoggerForConfig } from '@defra/lis-infra-ui-services/logging'

/**
 * @returns {Promise<Server>}
 */
export async function startServer() {
  const server = await createServer()
  const logger = getLoggerForConfig(config)

  await server.start()

  logger.info('Server started successfully')
  logger.info(
    `Access the front office on http://localhost:${config.get('port')}`
  )

  return server
}
