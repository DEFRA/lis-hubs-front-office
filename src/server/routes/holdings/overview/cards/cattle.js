import {
  PERMISSIONS,
  hasPermission
} from '@defra/lis-hubs-infra-access/authorization'
import { getMountPath } from '@defra/lis-hubs-infra-registry'

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

// Each cattle service, behind the permission to use it on the holding.
const services = [
  {
    text: 'Register a cattle birth',
    module: 'cattle-register',
    permission: PERMISSIONS.cattleRegisterWrite
  },
  {
    text: 'Report a cattle movement',
    module: 'cattle-move',
    permission: PERMISSIONS.cattleMoveWrite
  },
  {
    text: 'Report a cattle death',
    module: 'cattle-death',
    permission: PERMISSIONS.cattleDeathWrite
  }
]

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
 * linking to the animals list, the in-progress and errors cards, the cattle
 * services the user may use on the holding, and the help links.
 *
 * @param {Pick<HoldingSummary, 'cph' | 'cattle'>} summary
 * @param {object} user the signed-in user's authorization
 * @returns {SpeciesSection}
 */
export function toCattleSection({ cph, cattle }, user) {
  const animalsPath = `${getMountPath('cattle-home', 'holding', { cph })}/animals`

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
    services: services
      .filter(({ permission }) => hasPermission(user, { permission, cph }))
      .map(({ text, module }) => ({
        text,
        href: getMountPath(module, 'holding', { cph })
      })),
    help
  }
}
