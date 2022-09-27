/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidUri, IAttestation, IDelegationNode } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { isHex } from '@polkadot/util'
import { DelegationNode } from './DelegationNode.js'

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
export function permissionsAsBitset(delegation: IDelegationNode): Uint8Array {
  const permissionsBitsetData = delegation.permissions.reduce(
    (accumulator, currentValue) => accumulator + currentValue
  )
  const uint8 = new Uint8Array(4)
  uint8[0] = permissionsBitsetData
  return uint8
}

/**
 * Traverses a delegation tree and counts the number of delegation nodes between an attestation and an ancestral delegation node owned by `attester`.
 *
 * @param attester Identity to be located in the delegation tree.
 * @param attestation Attestation whose delegation tree to search.
 * @returns 0 if `attester` is the owner of `attestation`, the number of delegation nodes traversed otherwise.
 */
export async function countNodeDepth(
  attester: DidUri,
  attestation: IAttestation
): Promise<number> {
  let delegationTreeTraversalSteps = 0

  // if the attester is not the owner, we need to check the delegation tree
  if (attestation.owner !== attester && attestation.delegationId !== null) {
    delegationTreeTraversalSteps += 1
    try {
      const delegationNode = await DelegationNode.fetch(
        attestation.delegationId
      )
      const { steps, node } = await delegationNode.findAncestorOwnedBy(attester)
      delegationTreeTraversalSteps += steps
      if (node === null) {
        throw new SDKErrors.UnauthorizedError(
          'Attester is not authorized to revoke this attestation. (Attester not in delegation tree)'
        )
      }
    } catch {
      // ignore the error
    }
  } else if (attestation.owner !== attester) {
    throw new SDKErrors.UnauthorizedError(
      'Attester is not authorized to revoke this attestation. (Not the owner, no delegations)'
    )
  }

  return delegationTreeTraversalSteps
}

/**
 * Checks for errors on delegation node data.
 *
 * @param delegationNodeInput Delegation node data.
 */
export function errorCheck(delegationNodeInput: IDelegationNode): void {
  const { permissions, hierarchyId: rootId, parentId } = delegationNodeInput

  if (permissions.length === 0 || permissions.length > 3) {
    throw new SDKErrors.UnauthorizedError(
      'Must have at least one permission and no more then two'
    )
  }

  if (!rootId) {
    throw new SDKErrors.DelegationIdMissingError()
  } else if (typeof rootId !== 'string' || !isHex(rootId)) {
    throw new SDKErrors.DelegationIdTypeError()
  }
  if (parentId && (typeof parentId !== 'string' || !isHex(parentId))) {
    throw new SDKErrors.DelegationIdTypeError()
  }
}
