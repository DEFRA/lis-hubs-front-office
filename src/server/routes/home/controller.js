import { MODULES, SPECIES } from '@defra/lis-hubs-infra-registry'

// The design has no multi-species entry point yet, so this is a deliberately
// blunt species selector modelled on the archived livestock-usability/v3
// prototype: its species list with placeholder copy, only Cattle wired up.
const placeholderDescription =
  'Donec tristique velit pellentesque fringilla tincidunt.'

const speciesOptions = [
  'Cattle',
  'Sheep',
  'Pigs',
  'Goats',
  'Deer',
  'Camelids'
].map((label) => ({
  label,
  href: label === 'Cattle' ? '/cattle' : null,
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
