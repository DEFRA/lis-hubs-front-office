// Hardcoded to match the steel-thread/v2 prototype's "Holding details" tab:
// https://livestock-traceability-4f1c92f377cb.herokuapp.com/steel-thread/v2/holding-details
// No backend to call yet — see LREG-186/LREG-299.
const holding = {
  cphNumber: '12/345/0001',
  holdingName: 'Oakfield Farm',
  businessName: 'Oakfield Livestock Ltd',
  addressLines: [
    'Oakfield Farm',
    'Church Lane',
    'Shrewsbury',
    'Shropshire',
    'SY4 1AB',
    'England'
  ],
  holdingType: 'Permanent',
  registeredKeeper: 'James Williams',
  herdMark: 'UK 324537'
}

/**
 * @param {{ county?: string, parish?: string, holding?: string }} params route parameters
 * @returns {string|null} slash-separated CPH
 */
export function cphFromParams({ county, parish, holding: holdingNumber } = {}) {
  return county && parish && holdingNumber
    ? `${county}/${parish}/${holdingNumber}`
    : null
}

export const holdingDetailsController = {
  handler(request, h) {
    const authenticatedUser = request?.app?.hubAuth

    if (!authenticatedUser) {
      return h.redirect(`/auth/login?returnUrl=${request.path}`)
    }

    return h.view('holdings/details', {
      pageTitle: 'Holding details',
      holding,
      tabs: [{ text: 'Holding details', href: request.path, active: true }]
    })
  }
}
