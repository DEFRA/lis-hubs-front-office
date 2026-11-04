import {
  demandHoldingAccess,
  holdingOverviewController
} from './overview/controller.js'

export const holdings = {
  plugin: {
    name: 'holdings',
    register(server) {
      server.route({
        method: 'GET',
        path: '/holdings/{cph*3}',
        options: { pre: [{ method: demandHoldingAccess }] },
        ...holdingOverviewController
      })
    }
  }
}
