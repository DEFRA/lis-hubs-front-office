import Boom from '@hapi/boom'
import {
  PERMISSIONS,
  hasPermission
} from '@defra/lis-hubs-infra-access/authorization'

import { cattleHomeBe4FeClient } from '#server/common/helpers/cattle-home-be4fe-client.js'
import { toHoldingOverviewViewModel } from './view-model.js'

/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

const cphPattern = /^\d{2}\/\d{3}\/\d{4}$/

/**
 * Route pre-handler. Only a user granted cattle read on this CPH may view
 * it. Not found rather than forbidden, so a holding's existence isn't
 * confirmed to someone not entitled to it.
 *
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {symbol | Boom.Boom} h.continue, or a 404
 */
export function demandHoldingAccess(request, h) {
  const { cph } = request.params

  if (
    cphPattern.test(cph) &&
    hasPermission(request.auth.credentials.user, {
      permission: PERMISSIONS.cattleRead,
      cph
    })
  ) {
    return h.continue
  }

  return Boom.notFound()
}

// "In progress" and "Cattle with errors" have no data source yet; those
// tiles show zero until one exists.
const PLACEHOLDER_COUNT = 0

export const holdingOverviewController = {
  /**
   * @param {Request} request
   * @param {ResponseToolkit} h
   * @returns {Promise<ResponseObject>} the rendered overview page
   */
  async handler(request, h) {
    const { cph } = request.params
    const [userDetails, cattle] = await Promise.all([
      cattleHomeBe4FeClient.getUserDetails(request.auth.credentials.user.sub),
      cattleHomeBe4FeClient.getCattleOnHolding(cph)
    ])
    const holding = userDetails?.cphs?.find((entry) => entry.cph === cph)

    const summary = {
      cph,
      name: holding?.holding_name ?? null,
      cattle: {
        on_holding: cattle?.length ?? 0,
        in_progress: PLACEHOLDER_COUNT,
        with_errors: PLACEHOLDER_COUNT
      }
    }

    return h.view(
      'holdings/overview/overview',
      toHoldingOverviewViewModel(summary)
    )
  }
}
