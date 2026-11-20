/** @import { HoldingDetails } from '#server/common/helpers/cattle-home-be4fe-client.js' */

/**
 * One summary list row. A missing or empty value shows `emptyText` when
 * given, otherwise the "Not supplied" tag.
 *
 * @typedef {object} SummaryRow
 * @property {string} key
 * @property {string | null} [text] a single value
 * @property {string[]} [lines] values shown one per line
 * @property {string} [emptyText] what to show instead of the "Not supplied" tag
 */

/**
 * Maps the holding onto the holding details page: heading, the section tabs
 * and the holding and correspondence summary rows.
 *
 * @param {string} cph the CPH the user was authorised for, e.g. 12/345/0001
 * @param {HoldingDetails} holding
 * @returns {object} The holding details page template data
 */
export function toHoldingDetailsViewModel(cph, holding) {
  const name = holding.name || null
  const herdMarks = (holding.herd_marks ?? [])
    .map(({ mark }) => mark)
    .filter(Boolean)

  /** @type {SummaryRow[]} */
  const holdingRows = [
    { key: 'CPH number', text: cph },
    { key: 'Holding name', text: name },
    { key: 'Address', lines: (holding.address ?? []).filter(Boolean) },
    {
      key: herdMarks.length > 1 ? 'Herd marks' : 'Herd mark',
      lines: herdMarks,
      emptyText: 'Not recorded'
    }
  ]

  /** @type {SummaryRow[]} */
  const correspondenceRows = [
    {
      key: 'Address',
      lines: (holding.correspondence_address ?? []).filter(Boolean)
    }
  ]

  return {
    pageTitle: `Holding details - ${name || cph}`,
    cph,
    holdingName: name,
    tabs: [
      { text: 'Overview', href: `/holdings/${cph}` },
      {
        text: 'Holding details',
        href: `/holdings/${cph}/details`,
        active: true
      }
    ],
    holdingRows,
    correspondenceRows
  }
}
