/** @import { Server } from '@hapi/hapi' */

import { homeController } from './controller.js'

export const home = {
  plugin: {
    name: 'home',
    /**
     * Registers the route on the server.
     * @param {Server} server - The Hapi server
     */
    register(server) {
      server.route({
        method: 'GET',
        path: '/',
        options: { auth: { mode: 'try' } },
        ...homeController
      })
    }
  }
}
