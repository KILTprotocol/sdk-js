/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option, U128, Vec } from '@polkadot/types'
import type {
  IAttestation,
  IDelegationNode,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type { H256, Hash } from '@polkadot/types/interfaces'
import { DecoderUtils, SDKErrors } from '@kiltprotocol/utils'
import type { Chain as DidChain } from '@kiltprotocol/did'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { BN } from '@polkadot/util'
import {
  decodeDelegationNode,
  IChainDelegationNode,
} from './DelegationDecoder.js'
import { DelegationNode } from './DelegationNode.js'
import { permissionsAsBitset } from './DelegationNode.utils.js'
import type { AuthorizationId } from '../attestation/Attestation.chain.js'

const log = ConfigService.LoggingFactory.getLogger('DelegationNode')

/**
 * Generate the extrinsic to store a given delegation node as the root of a new delegation hierarchy.
 *
 * @param delegation The delegation node to store as hierarchy root.
 * @returns The SubmittableExtrinsic for the `createHierarchy` call.
 */
export async function getStoreAsRootTx(
  delegation: DelegationNode
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

  if (!delegation.isRoot()) {
    throw SDKErrors.ERROR_INVALID_ROOT_NODE
  }
  return blockchain.api.tx.delegation.createHierarchy(
    delegation.hierarchyId,
    await delegation.getCTypeHash()
  )
}

/**
 * Generate the extrinsic to store a given delegation node under a given delegation hierarchy.
 *
 * @param delegation The delegation node to store under the hierarchy specified as part of the node.
 * @param signature The DID signature of the delegee owner of the new delegation node.
 * @returns The SubmittableExtrinsic for the `addDelegation` call.
 */
export async function getStoreAsDelegationTx(
  delegation: DelegationNode,
  signature: DidChain.SignatureEnum
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

  if (delegation.isRoot()) {
    throw SDKErrors.ERROR_INVALID_DELEGATION_NODE
  }

  return blockchain.api.tx.delegation.addDelegation(
    delegation.id,
    delegation.parentId,
    DidUtils.getIdentifierFromKiltDid(delegation.account),
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
 * Generate the extrinsic to revoke a given delegation node. The submitter can be the owner of the delegation node itself or an ancestor thereof.
 *
 * @param delegationId The identifier of the delegation node to revoke.
 * @param maxParentChecks The max number of lookup to perform up the hierarchy chain to verify the authorisation of the caller to perform the revocation.
 * @param maxRevocations The max number of children nodes that will be revoked as part of the revocation operation. This value does not include the node itself being removed.
 * @returns The SubmittableExtrinsic for the `revokeDelegation` call.
 */
export async function getRevokeTx(
  delegationId: IDelegationNode['id'],
  maxParentChecks: number,
  maxRevocations: number
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic =
    blockchain.api.tx.delegation.revokeDelegation(
      delegationId,
      maxParentChecks,
      maxRevocations
    )
  return tx
}

/**
 * Generate the extrinsic to remove a given delegation node. The submitter can be the owner of the delegation node itself or an ancestor thereof.
 *
 * @param delegationId The identifier of the delegation node to remove.
 * @param maxRevocations The max number of children nodes that will be removed as part of the removal operation. This value does not include the node itself being removed.
 * @returns The SubmittableExtrinsic for the `removeDelegation` call.
 */
export async function getRemoveTx(
  delegationId: IDelegationNode['id'],
  maxRevocations: number
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic =
    blockchain.api.tx.delegation.removeDelegation(delegationId, maxRevocations)
  return tx
}

/**
 * Generate the extrinsic to reclaim the deposit for a given delegation node.
 *
 * The generated extrinsic can only be successfully executed if the submitter is the original payer of the delegation deposit.
 *
 * @param delegationId The identifier of the delegation node to claim back deposit for.
 * @param maxRemovals The max number of children nodes that will be removed as part of the operation. This value does not include the node itself being removed.
 * @returns The SubmittableExtrinsic for the `getReclaimDepositTx` call.
 */
export async function getReclaimDepositTx(
  delegationId: IDelegationNode['id'],
  maxRemovals: number
): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = api.tx.delegation.reclaimDeposit(
    delegationId,
    maxRemovals
  )
  return tx
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
        throw SDKErrors.ERROR_DELEGATION_ID_MISSING
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
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  if (blockchain.api.query.attestation.externalAttestations) {
    // this info is stored chain-side as a double map from (authorizationId, claimHash) -> boolean.
    // the following line retrieves all keys where authorizationId is equal to the delegation id.
    const entries =
      await blockchain.api.query.attestation.externalAttestations.keys<
        [AuthorizationId, H256]
      >({ delegation: id })
    // extract claimHash from double map key & decode
    return entries.map((keys) => {
      const claimHash = keys.args[1]
      DecoderUtils.assertCodecIsType(claimHash, ['H256'])
      return claimHash.toHex()
    })
  }
  if (blockchain.api.query.attestation.delegatedAttestations) {
    // Delegated attestations are stored as a simple map from delegationId -> Vec<claimHashes>
    const claimHashes =
      await blockchain.api.query.attestation.delegatedAttestations<
        Option<Vec<Hash>>
      >(id)
    DecoderUtils.assertCodecIsType(claimHashes, ['Option<Vec<H256>>'])
    return claimHashes.unwrapOrDefault().map((hash) => hash.toHex())
  }
  throw new SDKErrors.ERROR_CODEC_MISMATCH(
    'Failed to query delegated attestations: Unknown pallet storage'
  )
}

async function queryDepositAmountEncoded(): Promise<U128> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.consts.delegation.deposit as U128
}

/**
 * Gets the current deposit amount due for the creation of new delegation node.
 *
 * @returns Deposit amount in Femto Kilt as a BigNumber.
 */
export async function queryDepositAmount(): Promise<BN> {
  const encodedDeposit = await queryDepositAmountEncoded()
  return encodedDeposit.toBn()
}
