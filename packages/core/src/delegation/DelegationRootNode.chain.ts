/**
 * @packageDocumentation
 * @ignore
 */

import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Option } from '@polkadot/types'
import { IDelegationRootNode } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import Identity from '../identity/Identity'
import {
  decodeRootDelegation,
  IChainDelegationRoot,
  RootDelegationRecord,
} from './DelegationDecoder'
import DelegationRootNode from './DelegationRootNode'

export async function store(
  delegation: IDelegationRootNode,
  identity: Identity
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getCached()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.createRoot(
    delegation.id,
    delegation.cTypeHash
  )
  return blockchain.signTx(identity, tx)
}

export async function query(
  delegationId: IDelegationRootNode['id']
): Promise<DelegationRootNode | null> {
  const blockchain = await BlockchainApiConnection.getCached()
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

export async function revoke(
  delegation: IDelegationRootNode,
  identity: Identity
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getCached()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.revokeRoot(
    delegation.id
  )
  return blockchain.signTx(identity, tx)
}
