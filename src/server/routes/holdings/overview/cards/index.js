import { PERMISSIONS } from '@defra/lis-hubs-infra-access/authorization'

import { toCattleSection } from './cattle.js'

/**
 * @import { SpeciesSection } from './cattle.js'
 * @import { HoldingSummary } from '../view-model.js'
 */

/**
 * @typedef {object} SpeciesCard
 * @property {string} permission the read permission that shows this species on a holding
 * @property {(summary: HoldingSummary) => SpeciesSection} toSection
 */

/**
 * The species the overview can show, each behind its read permission. Only
 * cattle today; add an entry per species as its card lands.
 *
 * @type {SpeciesCard[]}
 */
export const speciesCards = [
  { permission: PERMISSIONS.cattleRead, toSection: toCattleSection }
]
