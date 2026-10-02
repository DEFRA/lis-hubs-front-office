/**
 * Maps krds's CphAssociationDto shape onto the countyParishHoldingNumber
 * shape the hub JWT's `holdings` and the profile view already expect,
 * carried over from identity-service-helper's CphAssignment.
 *
 * @param {{ id: string, cphNumber: string, role: string, holdingId: string | null, holdingName: string | null }[]} [cphAssociations]
 * @returns {{ id: string, countyParishHoldingId: string | null, countyParishHoldingNumber: string, holdingName: string | null, roleName: string }[]}
 */
export function toHoldings(cphAssociations = []) {
  return cphAssociations.map(
    ({ cphNumber, role, holdingId, ...association }) => ({
      ...association,
      countyParishHoldingId: holdingId,
      countyParishHoldingNumber: cphNumber,
      roleName: role
    })
  )
}

/**
 * Maps krds's per-CPH associations onto the `{ role, cph }` grants
 * resolveAuthorization expects, so each role applies only to its own CPH.
 * The krds role name is translated to a LIS role by infra-access's role
 * mappings; an unmapped role grants nothing.
 *
 * @param {{ cphNumber: string, role: string }[]} [cphAssociations]
 * @returns {{ role: string, cph: string }[]}
 */
export function toHoldingRoles(cphAssociations = []) {
  return cphAssociations.map(({ cphNumber, role }) => ({
    role,
    cph: cphNumber
  }))
}
