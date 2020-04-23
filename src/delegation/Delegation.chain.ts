/**
 * @packageDocumentation
 * @ignore
 */

import { Vec, H256, Option, Tuple } from '@polkadot/types'
import { getCached } from '../blockchainApiConnection'
import { CodecWithId } from './DelegationDecoder'
import { IDelegationBaseNode } from '../types/Delegation'

function decodeDelegatedAttestations(queryResult: Vec<H256>): string[] {
  return queryResult.map(hash => hash.toString())
}

export async function getAttestationHashes(
  id: IDelegationBaseNode['id']
): Promise<string[]> {
  const blockchain = await getCached()
  const encodedHashes = await blockchain.api.query.attestation.delegatedAttestations<
    Vec<H256>
  >(id)
  return decodeDelegatedAttestations(encodedHashes)
}

export async function getChildIds(
  id: IDelegationBaseNode['id']
): Promise<string[]> {
  const blockchain = await getCached()
  const childIds = await blockchain.api.query.delegation.children<Vec<H256>>(id)
  return childIds.map(hash => hash.toString())
}

export async function fetchChildren(
  childIds: string[]
): Promise<CodecWithId[]> {
  const blockchain = await getCached()
  const val: CodecWithId[] = await Promise.all(
    childIds.map(async (childId: string) => {
      const queryResult = await blockchain.api.query.delegation.delegations<
        Option<Tuple>
      >(childId)
      return {
        id: childId,
        codec: queryResult,
      }
    })
  )
  return val
}
