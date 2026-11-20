import Boom from '@hapi/boom'

import * as cattleHomeBe4FeClient from '#server/common/helpers/cattle-home-be4fe-client.js'
import { toHoldingDetailsViewModel } from './view-model.js'

/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

export const holdingDetailsController = {
  /**
   * @param {Request} request
   * @param {ResponseToolkit} h
   * @returns {Promise<ResponseObject>} the rendered holding details page
   */
  async handler(request, h) {
    const { cph } = request.params
    const holding = await cattleHomeBe4FeClient.getHoldingDetails(cph)

    if (holding === null) {
      throw Boom.notFound()
    }

    return h.view(
      'holdings/details/details',
      toHoldingDetailsViewModel(cph, holding)
    )
  }
}
