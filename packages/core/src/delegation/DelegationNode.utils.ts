/**
 * @packageDocumentation
 * @ignore
 */

import { IAttestation, IDelegationNode } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import Identity from '../identity'
import DelegationNode from './DelegationNode'

/**
 * Creates a bitset from the permissions in the array where each enum value
 * is used to set the bit flag in the set.
 *
 * ATTEST has `0000000000000001`  (decimal 1).
 * DELEGATE has `0000000000000010` (decimal 2).
 *
 * Adding the enum values results in a decimal representation of the bitset.
 *
 * @param delegation The delegation from which you want to convert the permissions to bitset.
 * @returns The bitset as single value uint8 array.
 */
// eslint-disable-next-line import/prefer-default-export
export default function permissionsAsBitset(
  delegation: IDelegationNode
): Uint8Array {
  const permissionsBitsetData: number = delegation.permissions.reduce(
    (accumulator, currentValue) => accumulator + currentValue
  )
  const uint8: Uint8Array = new Uint8Array(4)
  uint8[0] = permissionsBitsetData
  return uint8
}

export async function checkTraversalStepsToParent(
  attester: Identity,
  attestation: IAttestation
): Promise<number> {
  let delegationTreeTraversalSteps = 0

  // if the attester is not the owner, we need to check the delegation tree
  if (
    attestation.owner !== attester.address &&
    attestation.delegationId !== null
  ) {
    delegationTreeTraversalSteps += 1
    const delegationNode = await DelegationNode.query(attestation.delegationId)

    if (typeof delegationNode !== 'undefined' && delegationNode !== null) {
      const { steps, node } = await delegationNode.findParent(attester.address)
      delegationTreeTraversalSteps += steps
      if (node === null) {
        throw SDKErrors.ERROR_UNAUTHORIZED(
          'Attester is not athorized to revoke this attestation. (attester not in delegation tree)'
        )
      }
    }
  } else if (attestation.owner !== attester.address) {
    throw SDKErrors.ERROR_UNAUTHORIZED(
      'Attester is not athorized to revoke this attestation. (not the owner, no delegations)'
    )
  }

  return delegationTreeTraversalSteps
}
