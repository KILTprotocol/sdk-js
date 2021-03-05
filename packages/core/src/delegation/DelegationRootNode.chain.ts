/**
 * @packageDocumentation
 * @module DelegationRootNode
 */

import { Option } from '@polkadot/types'
import type {
  IDelegationRootNode,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import Identity from '../identity/Identity'
import {
  decodeRootDelegation,
  IChainDelegationRoot,
  RootDelegationRecord,
} from './DelegationDecoder'
import DelegationRootNode from './DelegationRootNode'

/**
 * @ignore
 */
export async function store(
  delegation: IDelegationRootNode,
  identity: Identity
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.createRoot(
    delegation.id,
    delegation.cTypeHash
  )
  return blockchain.signTx(identity, tx)
}

/**
 * @ignore
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
    const root = new DelegationRootNode(
      delegationId,
      decoded.cTypeHash,
      decoded.account
    )
    root.revoked = decoded.revoked
    return root
  }
  return null
}

/**
 * @ignore
 */
export async function revoke(
  delegation: IDelegationRootNode,
  identity: Identity
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.revokeRoot(
    delegation.id
  )
  return blockchain.signTx(identity, tx)
}
