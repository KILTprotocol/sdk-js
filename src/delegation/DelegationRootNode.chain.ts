/**
 * @module Delegation/DelegationRootNode
 */
import { SubmittableExtrinsic } from '@polkadot/api/SubmittableExtrinsic'
import { CodecResult } from '@polkadot/api/promise/types'

import { getCached } from '../blockchainApiConnection'
import { decodeRootDelegation } from '../delegation/DelegationDecoder'
import DelegationRootNode from '../delegation/DelegationRootNode'
import TxStatus from '../blockchain/TxStatus'
import Identity from '../identity/Identity'
import { IDelegationRootNode } from '../types/Delegation'

export async function store(
  delegation: IDelegationRootNode,
  identity: Identity
): Promise<TxStatus> {
  const blockchain = await getCached()
  const tx: SubmittableExtrinsic<
    CodecResult,
    any
  > = await blockchain.api.tx.delegation.createRoot(
    delegation.id,
    delegation.cTypeHash
  )
  return blockchain.submitTx(identity, tx)
}

export async function query(
  delegationId: IDelegationRootNode['id']
): Promise<DelegationRootNode | undefined> {
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
  const tx: SubmittableExtrinsic<
    CodecResult,
    any
  > = await blockchain.api.tx.delegation.revokeRoot(delegation.id)
  return blockchain.submitTx(identity, tx)
}
