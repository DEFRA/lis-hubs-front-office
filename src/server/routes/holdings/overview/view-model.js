import { hasPermission } from '@defra/lis-hubs-infra-access/authorization'

import { speciesCards } from './cards/index.js'

/**
 * @typedef {object} HoldingSummary
 * @property {string} cph
 * @property {string | null} name
 * @property {{ on_holding: number, in_progress: number, with_errors: number }} cattle
 */

/**
 * Maps the holding summary onto the overview page: heading, the section
 * tabs and one section per species the user may read on the holding, with
 * its cards and links.
 *
 * @param {HoldingSummary} summary
 * @param {object} user the signed-in user's authorization
 * @returns {object} The overview page template data
 */
export function toHoldingOverviewViewModel(summary, user) {
  const { cph } = summary
  const holdingName = summary.name ?? null

  return {
    pageTitle: holdingName ?? cph,
    holdingName,
    cph,
    tabs: [{ text: 'Overview', href: `/holdings/${cph}`, active: true }],
    speciesSections: speciesCards
      .filter(({ permission }) => hasPermission(user, { permission, cph }))
      .map(({ toSection }) => toSection(summary, user))
  }
}
