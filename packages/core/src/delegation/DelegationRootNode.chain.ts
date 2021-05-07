/**
 * @packageDocumentation
 * @module DelegationRootNode
 */

import type { Option } from '@polkadot/types'
import type {
  IDelegationRootNode,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import {
  decodeRootDelegation,
  IChainDelegationRoot,
  RootDelegationRecord,
} from './DelegationDecoder'
import DelegationRootNode from './DelegationRootNode'

/**
 * @param delegation
 * @internal
 */
export async function store(
  delegation: IDelegationRootNode
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.createRoot(
    delegation.id,
    delegation.cTypeHash
  )
  return tx
}

/**
 * @param delegationId
 * @internal
 */
export async function query(
  delegationId: IDelegationRootNode['id']
): Promise<DelegationRootNode | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const decoded: RootDelegationRecord | null = decodeRootDelegation(
    await blockchain.api.query.delegation.root<Option<IChainDelegationRoot>>(
      delegationId
    )
  )
  if (decoded) {
    const root = new DelegationRootNode({
      id: delegationId,
      cTypeHash: decoded.cTypeHash,
      account: decoded.account,
      revoked: decoded.revoked,
    })
    return root
  }
  return null
}

/**
 * @internal
 *
 * Revokes a full delegation tree, also revoking all constituent nodes.
 *
 * @param delegation The [[DelegationRootNode]] node in the delegation tree at which to revoke.
 * @param maxRevocations The maximum number of revocations that may be performed. Should be set to the number of nodes (including the root node) in the tree. Higher numbers result in a larger amount locked during the transaction, as each revocation adds to the fee that is charged.
 * @returns Unsigned [[SubmittableExtrinsic]] ready to be signed and dispatched.
 */
export async function revoke(
  delegation: IDelegationRootNode,
  maxRevocations: number
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.revokeRoot(
    delegation.id,
    maxRevocations
  )
  return tx
}
