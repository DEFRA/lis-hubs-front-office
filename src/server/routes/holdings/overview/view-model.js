import { toCattleSection } from './cards/cattle.js'

/**
 * @typedef {object} HoldingSummary
 * @property {string} cph
 * @property {string | null} name
 * @property {{ on_holding: number, in_progress: number, with_errors: number }} cattle
 */

/**
 * Maps the holding summary onto the overview page: heading, the section
 * tabs and one section per species with its cards and links.
 *
 * @param {HoldingSummary} summary
 * @returns {object} The overview page template data
 */
export function toHoldingOverviewViewModel(summary) {
  const { cph } = summary
  const holdingName = summary.name ?? null

  return {
    pageTitle: holdingName ?? cph,
    holdingName,
    cph,
    tabs: [{ text: 'Overview', href: `/holdings/${cph}`, active: true }],
    // One section per species the holding keeps. Only cattle today; add a
    // module under ./cards for each species as it lands.
    speciesSections: [toCattleSection(summary)]
  }
}
