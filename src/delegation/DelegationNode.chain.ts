/**
 * @packageDocumentation
 * @ignore
 */

import { SubmittableExtrinsic } from '@polkadot/api/promise/types'

import { SubmittableResult } from '@polkadot/api'
import { getCached } from '../blockchainApiConnection'
import { decodeDelegationNode } from './DelegationDecoder'
import DelegationNode from './DelegationNode'
import permissionsAsBitset from './DelegationNode.utils'
import Identity from '../identity/Identity'
import { IDelegationNode } from '../types/Delegation'

export async function store(
  delegation: IDelegationNode,
  identity: Identity,
  signature: string
): Promise<SubmittableResult> {
  const blockchain = await getCached()
  const includeParentId: boolean = delegation.parentId
    ? delegation.parentId !== delegation.rootId
    : false
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.addDelegation(
    delegation.id,
    delegation.rootId,
    includeParentId ? delegation.parentId : undefined,
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
): Promise<SubmittableResult> {
  const blockchain = await getCached()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.revokeDelegation(
    delegationId
  )
  return blockchain.submitTx(identity, tx)
}
