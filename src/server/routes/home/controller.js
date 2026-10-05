import { MODULES, SPECIES } from '@defra/lis-hubs-infra-registry'

import { cattleHomeBe4FeClient } from '#server/common/helpers/cattle-home-be4fe-client.js'
import { toHoldingsFromUserCphs } from '#server/common/helpers/cattle-home-be4fe-mapping.js'

export const homeController = {
  async handler(request, h) {
    const authenticatedUser = request.auth.isAuthenticated
      ? request.auth.credentials.user
      : null

    if (!authenticatedUser) {
      return h.view('home/welcome', {
        pageTitle: 'Welcome',
        heading: 'Livestock Information',
        supportedSpecies: SPECIES,
        supportedSpokes: MODULES,
        loginUrl: '/auth/login?returnUrl=/'
      })
    }
    const userDetails = await cattleHomeBe4FeClient.getUserDetails(
      authenticatedUser.sub
    )
    const holdings = toHoldingsFromUserCphs(userDetails?.cphs)

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
