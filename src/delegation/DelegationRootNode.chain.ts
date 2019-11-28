/**
 * @module Delegation/DelegationRootNode
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'

import { getCached } from '../blockchainApiConnection'
import { decodeRootDelegation } from './DelegationDecoder'
import DelegationRootNode from './DelegationRootNode'
import TxStatus from '../blockchain/TxStatus'
import Identity from '../identity/Identity'
import { IDelegationRootNode } from '../types/Delegation'

export async function store(
  delegation: IDelegationRootNode,
  identity: Identity
): Promise<TxStatus> {
  const blockchain = await getCached()
  const tx: SubmittableExtrinsic = await blockchain.api.tx.delegation.createRoot(
    delegation.id,
    delegation.cTypeHash
  )
  return blockchain.submitTx(identity, tx)
}

export async function query(
  delegationId: IDelegationRootNode['id']
): Promise<DelegationRootNode | null> {
  const blockchain = await getCached()
  const root = decodeRootDelegation(
    await blockchain.api.query.delegation.root(delegationId)
  )
  if (root) {
    root.id = delegationId
    return root
  }
  return root
}

export async function revoke(
  delegation: IDelegationRootNode,
  identity: Identity
): Promise<TxStatus> {
  const blockchain = await getCached()
  const tx: SubmittableExtrinsic = await blockchain.api.tx.delegation.revokeRoot(
    delegation.id
  )
  return blockchain.submitTx(identity, tx)
}
