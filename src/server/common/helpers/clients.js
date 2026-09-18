import { KrdsClient } from '@defra/lis-hubs-infra-access/krds-client'

import { config } from '#config/config.js'

export const krdsClient = new KrdsClient(
  config.get('krds.url'),
  config.get('krds.clientId'),
  config.get('krds.clientSecret')
)
