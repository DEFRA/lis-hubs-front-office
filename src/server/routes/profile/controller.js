import { config } from '#config/config.js'
import { ishClient } from '#server/common/helpers/clients.js'

// identity-service-helper has no geo data today, so this always returns null -
// kept so a holding's mapUrl can be wired up again once coordinates exist.
function buildHoldingMapUrl(holding) {
  if (!holding.longitude || !holding.latitude) {
    return null
  }

  const mapboxApiKey = config.get('mapbox.apiKey')
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-b44656(${holding.longitude},${holding.latitude})/auto/300x200?attribution=true&logo=true&access_token=${mapboxApiKey}`
}

export const profileController = {
  async handler(request, h) {
    const authenticatedUser = request?.app?.hubAuth

    if (!authenticatedUser) {
      return h.redirect('/auth/login?returnUrl=/profile')
    }

    const profile = await ishClient.fetchUserProfile(authenticatedUser.sub)
    const userProfile = {
      user: authenticatedUser,
      holdings: profile.directAssignments
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
