/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module DelegationNodeUtils
 */

import type {
  IAttestation,
  IDelegationNode,
  IDidDetails,
} from '@kiltprotocol/types'
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
  const permissionsBitsetData: number = delegation.permissions.reduce(
    (accumulator, currentValue) => accumulator + currentValue
  )
  const uint8: Uint8Array = new Uint8Array(4)
  uint8[0] = permissionsBitsetData
  return uint8
}

export async function countNodeDepth(
  attester: IDidDetails['uri'],
  attestation: IAttestation
): Promise<number> {
  let delegationTreeTraversalSteps = 0

  // if the attester is not the owner, we need to check the delegation tree
  if (attestation.owner !== attester && attestation.delegationId !== null) {
    delegationTreeTraversalSteps += 1
    const delegationNode = await DelegationNode.query(attestation.delegationId)

    if (typeof delegationNode !== 'undefined' && delegationNode !== null) {
      const { steps, node } = await delegationNode.findAncestorOwnedBy(attester)
      delegationTreeTraversalSteps += steps
      if (node === null) {
        throw SDKErrors.ERROR_UNAUTHORIZED(
          'Attester is not athorized to revoke this attestation. (attester not in delegation tree)'
        )
      }
    }
  } else if (attestation.owner !== attester) {
    throw SDKErrors.ERROR_UNAUTHORIZED(
      'Attester is not athorized to revoke this attestation. (not the owner, no delegations)'
    )
  }

  return delegationTreeTraversalSteps
}

export function errorCheck(delegationNodeInput: IDelegationNode): void {
  const { permissions, hierarchyId: rootId, parentId } = delegationNodeInput

  if (permissions.length === 0 || permissions.length > 3) {
    throw SDKErrors.ERROR_UNAUTHORIZED(
      'Must have at least one permission and no more then two'
    )
  }

  if (!rootId) {
    throw SDKErrors.ERROR_DELEGATION_ID_MISSING()
  } else if (typeof rootId !== 'string') {
    throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
  } else if (!isHex(rootId)) {
    throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }
  if (parentId) {
    if (typeof parentId !== 'string') {
      throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
    } else if (!isHex(parentId)) {
      throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
    }
  }
}
