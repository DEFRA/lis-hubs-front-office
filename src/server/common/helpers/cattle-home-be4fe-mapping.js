/**
 * @import { UserHolding } from './cattle-home-be4fe-client.js'
 */

/**
 * Maps the BE4FE's per-user CPHs onto the countyParishHoldingNumber shape
 * the home and profile views expect.
 *
 * @param {UserHolding[]} [cphs]
 * @returns {{ countyParishHoldingId: string | null | undefined, countyParishHoldingNumber: string, holdingName: string | null | undefined, roleName: string | null | undefined }[]}
 */
export function toHoldingsFromUserCphs(cphs = []) {
  return cphs.map(
    ({
      cph,
      holding_id: holdingId,
      holding_name: holdingName,
      role,
      ...rest
    }) => ({
      ...rest,
      countyParishHoldingId: holdingId,
      countyParishHoldingNumber: cph,
      holdingName,
      roleName: role
    })
  )
}
