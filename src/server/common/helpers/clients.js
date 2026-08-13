import { IdentityServiceHelperClient } from '@defra/lis-hubs-infra-access/ish-client'

import { config } from '#config/config.js'

export const ishClient = new IdentityServiceHelperClient(
  config.get('identityServiceHelper.url'),
  config.get('identityServiceHelper.apiKey')
)
