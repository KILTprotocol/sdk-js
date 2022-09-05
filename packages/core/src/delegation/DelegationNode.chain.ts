/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { bool, Option, U128, Vec } from '@polkadot/types'
import type {
  IAttestation,
  IDelegationNode,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type { H256, Hash } from '@polkadot/types/interfaces'
import { SDKErrors } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'
import type { BN } from '@polkadot/util'
import type { AugmentedQueryDoubleMap } from '@polkadot/api/types'
import type { Observable } from '@polkadot/types/types'
import type { ApiPromise } from '@polkadot/api'
import { decodeDelegationNode } from './DelegationDecoder.js'
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
  const api = await BlockchainApiConnection.getConnectionOrConnect()

  if (!delegation.isRoot()) {
    throw new SDKErrors.InvalidRootNodeError()
  }
  return api.tx.delegation.createHierarchy(
    delegation.hierarchyId,
    await delegation.getCTypeHash()
  )
}

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
  const api = await BlockchainApiConnection.getConnectionOrConnect()

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
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const decoded = decodeDelegationNode(
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
 * Generate the extrinsic to revoke a given delegation node. The submitter can be the owner of the delegation node itself or an ancestor thereof.
 *
 * @param delegationId The identifier of the delegation node to revoke.
 * @param maxParentChecks The max number of lookup to perform up the hierarchy chain to verify the authorization of the caller to perform the revocation.
 * @param maxRevocations The max number of children nodes that will be revoked as part of the revocation operation. This value does not include the node itself being removed.
 * @returns The SubmittableExtrinsic for the `revokeDelegation` call.
 */
export async function getRevokeTx(
  delegationId: IDelegationNode['id'],
  maxParentChecks: number,
  maxRevocations: number
): Promise<SubmittableExtrinsic> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.delegation.revokeDelegation(
    delegationId,
    maxParentChecks,
    maxRevocations
  )
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
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.delegation.removeDelegation(delegationId, maxRevocations)
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
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.delegation.reclaimDeposit(delegationId, maxRemovals)
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

type WithExternalAttestationsStorage = ApiPromise & {
  query: {
    attestation: {
      externalAttestations: AugmentedQueryDoubleMap<
        'promise',
        (
          key1: AuthorizationId | { delegation: string },
          key2: H256
        ) => Observable<Option<bool>>,
        [AuthorizationId, H256]
      >
    }
  }
}

function hasExternalAttestationsStorage(
  api: ApiPromise
): api is WithExternalAttestationsStorage {
  return 'externalAttestations' in api.query.attestation
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
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  if (hasExternalAttestationsStorage(api)) {
    // this info is stored chain-side as a double map from (authorizationId, claimHash) -> boolean.
    // the following line retrieves all keys where authorizationId is equal to the delegation id.
    const entries = await api.query.attestation.externalAttestations.keys({
      delegation: id,
    })
    // extract claimHash from double map key & decode
    return entries.map((keys) => keys.args[1].toHex())
  }
  if ('delegatedAttestations' in api.query.attestation) {
    // Delegated attestations are stored as a simple map from delegationId -> Vec<claimHashes>
    const claimHashes = await api.query.attestation.delegatedAttestations<
      Option<Vec<Hash>>
    >(id)
    return claimHashes.unwrapOrDefault().map((hash) => hash.toHex())
  }
  throw new SDKErrors.CodecMismatchError(
    'Failed to query delegated attestations: Unknown pallet storage'
  )
}

async function queryDepositAmountEncoded(): Promise<U128> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return api.consts.delegation.deposit
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
