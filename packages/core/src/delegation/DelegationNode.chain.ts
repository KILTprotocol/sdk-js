/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IAttestation,
  IDelegationNode,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { SDKErrors } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { delegationNodeFromChain } from './DelegationDecoder.js'
import { DelegationNode } from './DelegationNode.js'
import { permissionsAsBitset } from './DelegationNode.utils.js'

const log = ConfigService.LoggingFactory.getLogger('DelegationNode')

/**
 * Generate the extrinsic to store a given delegation node under a given delegation hierarchy.
 *
 * @param delegation The delegation node to store under the hierarchy specified as part of the node.
 * @param signature The DID signature of the delegate owner of the new delegation node.
 * @returns The SubmittableExtrinsic for the `addDelegation` call.
 */
export async function getStoreAsDelegationTx(
  delegation: DelegationNode,
  signature: DidUtils.EncodedSignature
): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')

  if (delegation.isRoot()) {
    throw new SDKErrors.InvalidDelegationNodeError()
  }

  return api.tx.delegation.addDelegation(
    delegation.id,
    delegation.parentId || '',
    DidUtils.parseDidUri(delegation.account).address,
    permissionsAsBitset(delegation),
    signature
  )
}

/**
 * Query a delegation node from the blockchain given its identifier.
 *
 * @param delegationId The delegation node ID to query.
 * @returns Either the retrieved [[DelegationNode]] or null.
 */
export async function query(
  delegationId: IDelegationNode['id']
): Promise<DelegationNode | null> {
  const api = ConfigService.get('api')
  const decoded = delegationNodeFromChain(
    await api.query.delegation.delegationNodes(delegationId)
  )
  if (!decoded) {
    return null
  }
  return new DelegationNode({
    ...decoded,
    id: delegationId,
  })
}

/**
 * Query the blockchain to retrieve the number of **direct** children of a given delegation node.
 *
 * @param delegationNode The delegation node to perform the lookup for.
 * @returns A list of [[DelegationNode]] containing all the direct children of the provided node.
 */
export async function getChildren(
  delegationNode: DelegationNode
): Promise<DelegationNode[]> {
  log.info(` :: getChildren('${delegationNode.id}')`)
  const childrenNodes = await Promise.all(
    delegationNode.childrenIds.map(async (childId: IDelegationNode['id']) => {
      const childNode = await query(childId)
      if (!childNode) {
        throw new SDKErrors.DelegationIdMissingError()
      }
      return childNode
    })
  )
  log.info(`children: ${JSON.stringify(childrenNodes)}`)
  return childrenNodes
}

/**
 * Query the blockchain to retrieve all the attestations (their claim hashes) created with the provided delegation.
 *
 * @param id The identifier of the delegation node to retrieve delegated attestations for.
 * @returns A list of claim hashes issued using the provided delegation.
 */
export async function getAttestationHashes(
  id: IDelegationNode['id']
): Promise<Array<IAttestation['claimHash']>> {
  const api = ConfigService.get('api')
  // this info is stored chain-side as a double map from (authorizationId, claimHash) -> boolean.
  // the following line retrieves all keys where authorizationId is equal to the delegation id.
  const entries = await api.query.attestation.externalAttestations.keys({
    Delegation: id,
  })
  // extract claimHash from double map key & decode
  return entries.map((keys) => keys.args[1].toHex())
}
