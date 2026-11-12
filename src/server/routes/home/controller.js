/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

import { MODULES, SPECIES } from '@defra/lis-hubs-infra-registry'

import * as cattleHomeBe4FeClient from '#server/common/helpers/cattle-home-be4fe-client.js'
import { toHoldingsFromUserCphs } from '#server/common/helpers/cattle-home-be4fe-mapping.js'

export const homeController = {
  /**
   * Renders the welcome page, or redirects or lists the signed-in user's holdings.
   * @param {Request} request - The Hapi request
   * @param {ResponseToolkit} h - The Hapi response toolkit
   * @returns {Promise<ResponseObject>} The view or redirect response
   */
  async handler(request, h) {
    const authenticatedUser = request.auth.isAuthenticated
      ? request.auth.credentials.user
      : null

    if (!authenticatedUser) {
      return h.view('home/welcome', {
        pageTitle: 'Welcome',
        heading: 'Livestock Information Service (LIS) for cattle',
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
    if (holdings.length === 1) {
      return h.redirect(`/holdings/${holdings[0].countyParishHoldingNumber}`)
    }

    return h.view('home/holdings', {
      pageTitle: 'My holdings',
      holdings
    })
  }
}
