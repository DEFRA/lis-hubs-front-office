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
