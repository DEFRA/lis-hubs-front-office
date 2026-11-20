/** @import { Server } from '@hapi/hapi' */

import { holdingDetailsController } from './details/controller.js'
import {
  demandHoldingAccess,
  holdingOverviewController
} from './overview/controller.js'

export const holdings = {
  plugin: {
    name: 'holdings',
    /**
     * Registers the route on the server.
     * @param {Server} server - The Hapi server
     */
    register(server) {
      server.route({
        method: 'GET',
        path: '/holdings/{cph*3}',
        options: { pre: [{ method: demandHoldingAccess }] },
        ...holdingOverviewController
      })

      server.route({
        method: 'GET',
        path: '/holdings/{cph*3}/details',
        options: { pre: [{ method: demandHoldingAccess }] },
        ...holdingDetailsController
      })
    }
  }
}
