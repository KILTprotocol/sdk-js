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
import { Hash } from '@polkadot/types/interfaces'
import { DecoderUtils } from '@kiltprotocol/utils'
import {
  CodecWithId,
  decodeDelegationNode,
  IChainDelegationNode,
} from './DelegationDecoder'
import DelegationNode from './DelegationNode'
import { permissionsAsBitset } from './DelegationNode.utils'

const log = ConfigService.LoggingFactory.getLogger('DelegationBaseNode')

/**
 * @param delegation The delegation to store on chain.
 * @param signature The delegatee's signature to ensure the delegation is created with their consent.
 * @internal
 */
export async function store(
  delegation: IDelegationNode,
  signature: string
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.addDelegation(
    delegation.id,
    delegation.hierarchyId,
    delegation.parentId !== null ? delegation.parentId : undefined,
    delegation.account,
    permissionsAsBitset(delegation),
    signature
  )
  return tx
}

/**
 * @param delegationId The id of the delegation node to query.
 * @internal
 */
export async function query(
  delegationId: IDelegationNode['id']
): Promise<DelegationNode | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const decoded = decodeDelegationNode(
    await blockchain.api.query.delegation.delegations<
      Option<IChainDelegationNode>
    >(delegationId)
  )
  if (!decoded) {
    return null
  }
  const root = new DelegationNode({
    id: delegationId,
    hierarchyId: decoded.hierarchyId,
    parentId: decoded.parentId,
    childrenIds: decoded.childrenIds,
    account: decoded.account,
    permissions: decoded.permissions,
    revoked: decoded.revoked,
  })

  return root
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

async function fetchChildren(
  childrenIds: string[]
): Promise<Array<CodecWithId<Option<IChainDelegationNode>>>> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const val: Array<CodecWithId<
    Option<IChainDelegationNode>
  >> = await Promise.all(
    childrenIds.map(async (childId: string) => {
      const queryResult = await blockchain.api.query.delegation.delegations<
        Option<IChainDelegationNode>
      >(childId)
      return {
        id: childId,
        codec: queryResult,
      }
    })
  )
  return val
}

/**
 * @param delegationNode The delegation node to fetch children from.
 * @internal
 */
export async function getChildren(
  delegationNode: DelegationNode
): Promise<DelegationNode[]> {
  log.info(` :: getChildren('${delegationNode.id}')`)
  const queryResults: Array<CodecWithId<
    Option<IChainDelegationNode>
  >> = await fetchChildren(delegationNode.childrenIds)
  const children: DelegationNode[] = queryResults
    .map((codec: CodecWithId<Option<IChainDelegationNode>>) => {
      const decoded = decodeDelegationNode(codec.codec)
      if (!decoded) {
        return null
      }
      const child = new DelegationNode({
        id: codec.id,
        hierarchyId: decoded.hierarchyId,
        parentId: decoded.parentId,
        account: decoded.account,
        permissions: decoded.permissions,
        revoked: decoded.revoked,
      })
      return child
    })
    .filter((value): value is DelegationNode => {
      return value !== null
    })
  log.info(`children: ${JSON.stringify(children)}`)
  return children
}

function decodeDelegatedAttestations(queryResult: Option<Vec<Hash>>): string[] {
  DecoderUtils.assertCodecIsType(queryResult, ['Option<Vec<ClaimHashOf>>'])
  return queryResult.unwrapOrDefault().map((hash) => hash.toHex())
}

/**
 * @param id The id of the delegation node for which to fetch all the attestations issued.
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
