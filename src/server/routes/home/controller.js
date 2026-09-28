import { MODULES, SPECIES } from '@defra/lis-hubs-infra-registry'

import { krdsClient } from '#server/common/helpers/clients.js'
import { toHoldings } from '#server/common/helpers/krds-mapping.js'

export const homeController = {
  async handler(request, h) {
    const authenticatedUser = request.app?.hubAuth

    if (!authenticatedUser) {
      return h.view('home/welcome', {
        pageTitle: 'Welcome',
        heading: 'Livestock Information',
        supportedSpecies: SPECIES,
        supportedSpokes: MODULES,
        loginUrl: '/auth/login?returnUrl=/'
      })
    }
    const account = await krdsClient.fetchUserAccount(authenticatedUser.sub)
    const holdings = toHoldings(account.cphAssociations)

    if (holdings.length === 0) {
      return h.view('home/no-holdings', {
        pageTitle: 'My holdings'
      })
    }
    // Temporary steel-thread shortcut: assumes every holding is cattle.
    if (holdings.length === 1) {
      return h.redirect(
        `/cattle/holdings/${holdings[0].countyParishHoldingNumber}`
      )
    }

    return h.view('home/holdings', {
      pageTitle: 'My holdings',
      holdings
    })
  }
}
