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
import { DecoderUtils, SDKErrors } from '@kiltprotocol/utils'
import { decodeDelegationNode, IChainDelegationNode } from './DelegationDecoder'
import DelegationNode from './DelegationNode'
import { permissionsAsBitset } from './DelegationNode.utils'

const log = ConfigService.LoggingFactory.getLogger('DelegationNode')

export async function storeAsRoot(
  delegation: DelegationNode
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

  if (!delegation.isRoot()) {
    throw SDKErrors.ERROR_INVALID_ROOT_NODE
  }
  return blockchain.api.tx.delegation.createHierarchy(
    delegation.id,
    await delegation.cTypeHash
  )
}

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
    delegation.hierarchyId,
    delegation.parentId,
    delegation.account,
    permissionsAsBitset(delegation),
    signature
  )
}

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

function decodeDelegatedAttestations(queryResult: Option<Vec<Hash>>): string[] {
  DecoderUtils.assertCodecIsType(queryResult, ['Option<Vec<ClaimHashOf>>'])
  return queryResult.unwrapOrDefault().map((hash) => hash.toHex())
}

export async function getAttestationHashes(
  id: IDelegationNode['id']
): Promise<string[]> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encodedHashes = await blockchain.api.query.attestation.delegatedAttestations<
    Option<Vec<Hash>>
  >(id)
  return decodeDelegatedAttestations(encodedHashes)
}
