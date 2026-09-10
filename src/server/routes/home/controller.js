import { MODULES, SPECIES } from '@defra/lis-hubs-infra-registry'

// The design has no multi-species entry point yet, so this is a deliberately
// blunt species selector modelled on the archived livestock-usability/v3
// prototype: every species from the registry is listed with placeholder copy,
// but only Cattle is wired up - the rest are disabled.
const availableSpeciesId = 'cattle'
const placeholderDescription =
  'Donec tristique velit pellentesque fringilla tincidunt.'

const speciesOptions = SPECIES.map((species) => ({
  label: species.label,
  href: species.id === availableSpeciesId ? `/${species.id}` : null,
  description: placeholderDescription
}))

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
