import { createProfileService } from '@livestock/ui-services'

import { config } from '#config/config.js'

const fetchUserProfile = createProfileService({ config })

function buildHoldingMapUrl(holding) {
  let pins = ''

  for (const [index, cph] of holding.cphs.entries()) {
    cph.idx = index + 1

    if (cph.longitude && cph.latitude) {
      pins += `pin-l-${index + 1}+b44656(${cph.longitude},${cph.latitude}),`
    }
  }

  if (!pins) {
    return null
  }

  const mapboxApiKey = config.get('mapbox.apiKey')
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pins.slice(0, -1)}/auto/300x200?attribution=true&logo=true&access_token=${mapboxApiKey}`
}

export const profileController = {
  async handler(request, h) {
    const authenticatedUser = request?.app?.hubAuth

    if (!authenticatedUser) {
      return h.redirect('/auth/login?returnUrl=/profile')
    }

    const userProfile = await fetchUserProfile(authenticatedUser)
    userProfile.user = authenticatedUser

    for (const holding of userProfile.holdings ?? []) {
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
