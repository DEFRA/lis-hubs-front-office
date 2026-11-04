import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'

/**
 * @import { HoldingSummary } from '../view-model.js'
 */

/**
 * @typedef {object} StatusCard
 * @property {string} label
 * @property {number} count
 * @property {'green' | 'amber' | 'red'} status
 * @property {string} [href] makes the card a link
 */

/**
 * @typedef {object} Link
 * @property {string} text
 * @property {string} href
 */

/**
 * @typedef {object} SpeciesSection
 * @property {string} code species code from the registry
 * @property {string} label section heading
 * @property {StatusCard[]} cards
 * @property {Link[]} services the species' reporting services
 * @property {Link[]} help guidance and contact links for the species
 */

const help = [
  {
    text: 'GOV.UK guidance for cattle',
    href: 'https://www.gov.uk/government/collections/keeping-cattle-bison-and-buffalo-in-england-and-wales'
  },
  {
    text: 'Contact BCMS',
    href: 'https://www.gov.uk/government/organisations/british-cattle-movement-service'
  }
]

/**
 * The cattle section of the holding overview: the cattle-on-holding card
 * linking to the animals list, the in-progress and errors cards, and the
 * cattle services and help links.
 *
 * @param {Pick<HoldingSummary, 'cph' | 'cattle'>} summary
 * @returns {SpeciesSection}
 */
export function toCattleSection({ cph, cattle }) {
  const animalsPath = `${getBasePathForModule('cattle-home')}/holdings/${cph}/animals`

  return {
    code: 'ctt',
    label: 'Cattle',
    cards: [
      {
        label: 'Cattle on holding',
        count: cattle.on_holding,
        status: 'green',
        href: animalsPath
      },
      { label: 'In progress', count: cattle.in_progress, status: 'amber' },
      { label: 'Cattle with errors', count: cattle.with_errors, status: 'red' }
    ],
    services: [
      {
        text: 'Register a cattle birth',
        href: getBasePathForModule('cattle-register')
      },
      {
        text: 'Report a cattle movement',
        href: getBasePathForModule('cattle-move')
      },
      {
        text: 'Report a cattle death',
        href: getBasePathForModule('cattle-death')
      }
    ],
    help
  }
}
