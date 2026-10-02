import { KrdsClient } from './krds-client.js'

import { config } from '#config/config.js'

export const krdsClient = new KrdsClient(
  config.get('krds.url'),
  config.get('krds.clientId'),
  config.get('krds.clientSecret')
)
