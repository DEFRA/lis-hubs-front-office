/**
 * @import { UserHolding } from './cattle-home-be4fe-client.js'
 */

/**
 * Maps the BE4FE's per-user CPHs onto the countyParishHoldingNumber shape
 * the home view expects: one holding per CPH, with the user's roles on
 * that CPH joined in the order the BE4FE gave them.
 *
 * @param {UserHolding[]} [cphs]
 * @returns {{ countyParishHoldingId: string | null | undefined, countyParishHoldingNumber: string, holdingName: string | null | undefined, roleName: string | null | undefined }[]}
 */
export function toHoldingsFromUserCphs(cphs = []) {
  const holdingsByCph = new Map()

  for (const {
    cph,
    holding_id: holdingId,
    holding_name: holdingName,
    role,
    ...rest
  } of cphs) {
    const holding = holdingsByCph.get(cph)

    if (holding) {
      if (role && !holding.roles.includes(role)) {
        holding.roles.push(role)
      }
    } else {
      holdingsByCph.set(cph, {
        ...rest,
        countyParishHoldingId: holdingId,
        countyParishHoldingNumber: cph,
        holdingName,
        roles: role ? [role] : [],
        roleName: role
      })
    }
  }

  return [...holdingsByCph.values()].map(({ roles, roleName, ...holding }) => ({
    ...holding,
    roleName: roles.length > 0 ? roles.join(', ') : roleName
  }))
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
