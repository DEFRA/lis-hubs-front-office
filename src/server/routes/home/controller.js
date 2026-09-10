import { MODULES, SPECIES } from '@defra/lis-hubs-infra-registry'

// The design has no multi-species entry point yet, so this is a deliberately
// blunt species selector: only Cattle is wired up, the rest are placeholders.
const speciesOptions = [
  {
    label: 'Cattle',
    description:
      'Manage cattle births, movements and deaths, and your holding details.',
    href: '/cattle'
  },
  {
    label: 'Sheep',
    description: 'Not yet available in this service.'
  },
  {
    label: 'Chicken',
    description: 'Not yet available in this service.'
  }
]

export const homeController = {
  handler(request, h) {
    if (request.app?.hubAuth) {
      return h.view('home/species', {
        pageTitle: 'Choose a species',
        speciesOptions
      })
    }

    return h.view('home/welcome', {
      pageTitle: 'Welcome',
      heading: 'Livestock Information',
      supportedSpecies: SPECIES,
      supportedSpokes: MODULES,
      loginUrl: '/auth/login?returnUrl=/'
    })
  }
}
