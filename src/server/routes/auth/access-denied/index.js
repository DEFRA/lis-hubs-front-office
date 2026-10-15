import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { ACCESS_DENIED_PATH } from '../index.js'

export const accessDenied = {
  plugin: {
    name: 'access-denied',
    register(server) {
      server.route({
        method: 'GET',
        path: ACCESS_DENIED_PATH,
        // A refused user stays signed in so they can sign out from here.
        options: { auth: { mode: 'try' } },
        handler(request, h) {
          return h
            .view('auth/access-denied/index', {
              pageTitle: 'You do not have permission to use this service yet',
              ...(request.auth.isAuthenticated
                ? { signOutHref: '/signout' }
                : {})
            })
            .code(statusCodes.forbidden)
        }
      })
    }
  }
}
