/**
 * @packageDocumentation
 * @ignore
 */

import { SubmittableResult } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Option, Tuple } from '@polkadot/types'
import { getCached } from '../blockchainApiConnection'
import Identity from '../identity/Identity'
import { IDelegationRootNode } from '../types/Delegation'
import { decodeRootDelegation, RootDelegationRecord } from './DelegationDecoder'
import DelegationRootNode from './DelegationRootNode'

export async function store(
  delegation: IDelegationRootNode,
  identity: Identity
): Promise<SubmittableResult> {
  const blockchain = await getCached()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.createRoot(
    delegation.id,
    delegation.cTypeHash
  )
  return blockchain.submitTx(identity, tx)
}

export async function query(
  delegationId: IDelegationRootNode['id']
): Promise<DelegationRootNode | null> {
  const blockchain = await getCached()
  const decoded: RootDelegationRecord | null = decodeRootDelegation(
    await blockchain.api.query.delegation.root<Option<Tuple> | Tuple>(
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

export async function revoke(
  delegation: IDelegationRootNode,
  identity: Identity
): Promise<SubmittableResult> {
  const blockchain = await getCached()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.revokeRoot(
    delegation.id
  )
  return blockchain.submitTx(identity, tx)
}
