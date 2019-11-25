/**
 * @module Delegation/DelegationNode
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Option, Text } from '@polkadot/types'

import { getCached } from '../blockchainApiConnection'
import { decodeDelegationNode } from './DelegationDecoder'
import DelegationNode from './DelegationNode'
import { permissionsAsBitset } from './DelegationNode.utils'
import TxStatus from '../blockchain/TxStatus'
import Identity from '../identity/Identity'
import { IDelegationNode } from '../types/Delegation'

export async function store(
  delegation: IDelegationNode,
  identity: Identity,
  signature: string
): Promise<TxStatus> {
  const blockchain = await getCached()
  const includeParentId: boolean = delegation.parentId
    ? delegation.parentId !== delegation.rootId
    : false
  const tx: SubmittableExtrinsic = await blockchain.api.tx.delegation.addDelegation(
    delegation.id,
    delegation.rootId,
    new Option(Text, includeParentId ? delegation.parentId : undefined),
    delegation.account,
    permissionsAsBitset(delegation),
    signature
  )
  return blockchain.submitTx(identity, tx)
}

export async function query(
  delegationId: IDelegationNode['id']
): Promise<DelegationNode | null> {
  const blockchain = await getCached()
  const decoded = decodeDelegationNode(
    await blockchain.api.query.delegation.delegations(delegationId)
  )
  if (decoded) {
    decoded.id = delegationId
  }
  return decoded
}

export async function revoke(
  delegationId: IDelegationNode['id'],
  identity: Identity
): Promise<TxStatus> {
  const blockchain = await getCached()
  const tx: SubmittableExtrinsic = await blockchain.api.tx.delegation.revokeDelegation(
    delegationId
  )
  return blockchain.submitTx(identity, tx)
}
