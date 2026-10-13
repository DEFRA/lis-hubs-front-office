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

/**
 * Maps the BE4FE's per-user CPHs onto the `{ role, cph }` grants
 * resolveAuthorization expects, so each role applies only to its own CPH.
 * The role name is translated to a LIS role by infra-access's role
 * mappings; an unmapped role grants nothing.
 *
 * @param {UserHolding[]} [cphs]
 * @returns {{ role: string | null | undefined, cph: string }[]}
 */
export function toHoldingRolesFromUserCphs(cphs = []) {
  return cphs.map(({ cph, role }) => ({ role, cph }))
}
