/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module DelegationNode
 */

import type { Option, Vec } from '@polkadot/types'
import type { IDelegationNode, SubmittableExtrinsic } from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type { Hash } from '@polkadot/types/interfaces'
import { DecoderUtils, SDKErrors } from '@kiltprotocol/utils'
import { decodeDelegationNode, IChainDelegationNode } from './DelegationDecoder'
import DelegationNode from './DelegationNode'
import { permissionsAsBitset } from './DelegationNode.utils'

const log = ConfigService.LoggingFactory.getLogger('DelegationNode')

/**
 * @param delegation
 * @internal
 */
export async function storeAsRoot(
  delegation: DelegationNode
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

  if (!delegation.isRoot()) {
    throw SDKErrors.ERROR_INVALID_ROOT_NODE
  }
  return blockchain.api.tx.delegation.createHierarchy(
    delegation.hierarchyId,
    await delegation.cTypeHash
  )
}

/**
 * @param delegation
 * @param signature
 * @internal
 */
export async function storeAsDelegation(
  delegation: DelegationNode,
  signature: string
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

  if (delegation.isRoot()) {
    throw SDKErrors.ERROR_INVALID_DELEGATION_NODE
  }

  return blockchain.api.tx.delegation.addDelegation(
    delegation.id,
    delegation.parentId,
    delegation.account,
    permissionsAsBitset(delegation),
    signature
  )
}

/**
 * @param delegation
 * @param delegationId
 * @internal
 */
export async function query(
  delegationId: IDelegationNode['id']
): Promise<DelegationNode | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const decoded = decodeDelegationNode(
    await blockchain.api.query.delegation.delegationNodes<
      Option<IChainDelegationNode>
    >(delegationId)
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
 * @internal
 *
 * Revokes part of a delegation tree at specified node, also revoking all nodes below.
 *
 * @param delegationId The id of the node in the delegation tree at which to revoke.
 * @param maxDepth How many nodes may be traversed upwards in the hierarchy when searching for a node owned by `identity`. Each traversal will add to the transaction fee. Therefore a higher number will increase the fees locked until the transaction is complete. A number lower than the actual required traversals will result in a failed extrinsic (node will not be revoked).
 * @param maxRevocations How many delegation nodes may be revoked during the process. Each revocation adds to the transaction fee. A higher number will require more fees to be locked while an insufficiently high number will lead to premature abortion of the revocation process, leaving some nodes unrevoked. Revocations will first be performed on child nodes, therefore the current node is only revoked when this is accurate.
 * @returns An unsigned SubmittableExtrinsic ready to be signed and dispatched.
 */
export async function revoke(
  delegationId: IDelegationNode['id'],
  maxDepth: number,
  maxRevocations: number
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.revokeDelegation(
    delegationId,
    maxDepth,
    maxRevocations
  )
  return tx
}

/**
 * @param delegationNodeId
 * @param delegationNode
 * @internal
 */
export async function getChildren(
  delegationNode: DelegationNode
): Promise<DelegationNode[]> {
  log.info(` :: getChildren('${delegationNode.id}')`)
  const childrenNodes = await Promise.all(
    delegationNode.childrenIds.map(async (childId) => {
      const childNode = await query(childId)
      if (!childNode) {
        throw SDKErrors.ERROR_DELEGATION_ID_MISSING
      }
      return childNode
    })
  )
  log.info(`children: ${JSON.stringify(childrenNodes)}`)
  return childrenNodes
}

/**
 * @param delegationNodeId
 * @param queryResult
 * @internal
 */
function decodeDelegatedAttestations(queryResult: Option<Vec<Hash>>): string[] {
  DecoderUtils.assertCodecIsType(queryResult, ['Option<Vec<ClaimHashOf>>'])
  return queryResult.unwrapOrDefault().map((hash) => hash.toHex())
}

/**
 * @param delegationNodeId
 * @param id
 * @internal
 */
export async function getAttestationHashes(
  id: IDelegationNode['id']
): Promise<string[]> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encodedHashes = await blockchain.api.query.attestation.delegatedAttestations<
    Option<Vec<Hash>>
  >(id)
  return decodeDelegatedAttestations(encodedHashes)
}
