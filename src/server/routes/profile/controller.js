import { config } from '#config/config.js'
import { cattleHomeBe4FeClient } from '#server/common/helpers/cattle-home-be4fe-client.js'
import { toHoldingsFromUserCphs } from '#server/common/helpers/cattle-home-be4fe-mapping.js'

// The BE4FE has no geo data today, so this always returns null - kept so a
// holding's mapUrl can be wired up again once coordinates exist.
function buildHoldingMapUrl(holding) {
  if (!holding.longitude || !holding.latitude) {
    return null
  }

  const mapboxApiKey = config.get('mapbox.apiKey')
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-b44656(${holding.longitude},${holding.latitude})/auto/300x200?attribution=true&logo=true&access_token=${mapboxApiKey}`
}

export const profileController = {
  async handler(request, h) {
    const authenticatedUser = request.auth.credentials.user

    const userDetails = await cattleHomeBe4FeClient.getUserDetails(
      authenticatedUser.sub
    )
    const userProfile = {
      user: authenticatedUser,
      holdings: toHoldingsFromUserCphs(userDetails?.cphs)
    }

    for (const holding of userProfile.holdings) {
      holding.mapUrl = buildHoldingMapUrl(holding)
    }

    return h.view('profile/index', {
      pageTitle: 'Profile',
      heading: 'Profile and Settings',
      breadcrumbs: [
        {
          text: 'Home',
          href: '/'
        }
      ],
      userProfile
    })
  }
}
