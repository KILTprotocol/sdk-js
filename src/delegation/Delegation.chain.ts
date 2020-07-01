/**
 * @packageDocumentation
 * @ignore
 */

import { Option, Tuple, Vec } from '@polkadot/types'
import { H256 } from '@polkadot/types/interfaces'
import { getCached } from '../blockchainApiConnection'
import { IDelegationBaseNode } from '../types/Delegation'
import { assertCodecIsType } from '../util/Decode'
import { CodecWithId } from './DelegationDecoder'

function decodeDelegatedAttestations(queryResult: Vec<H256>): string[] {
  assertCodecIsType(queryResult, ['Vec<H256>'])
  return queryResult.map((hash) => hash.toString())
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
  assertCodecIsType(childIds, ['Vec<H256>'])
  return childIds.map((hash) => hash.toString())
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
