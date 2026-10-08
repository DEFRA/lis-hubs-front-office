import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { ACCESS_DENIED_PATH } from '../index.js'

export const accessDenied = {
  plugin: {
    name: 'access-denied',
    register(server) {
      server.route({
        method: 'GET',
        path: ACCESS_DENIED_PATH,
        options: { auth: false },
        handler(_request, h) {
          return h
            .view('auth/access-denied/index', {
              pageTitle: 'You cannot use this service yet'
            })
            .code(statusCodes.forbidden)
        }
      })
    }
  }
}
