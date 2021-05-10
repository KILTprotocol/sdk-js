/**
 * @packageDocumentation
 * @module DelegationBaseNode
 */

import type { Option, Vec } from '@polkadot/types'
import type { H256 } from '@polkadot/types/interfaces'
import type { IDelegationBaseNode } from '@kiltprotocol/types'
import { DecoderUtils } from '@kiltprotocol/utils'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type { CodecWithId, IChainDelegationNode } from './DelegationDecoder'

function decodeDelegatedAttestations(queryResult: Vec<H256>): string[] {
  DecoderUtils.assertCodecIsType(queryResult, ['Vec<Hash>'])
  return queryResult.map((hash) => hash.toString())
}

/**
 * @param id
 * @internal
 */
export async function getAttestationHashes(
  id: IDelegationBaseNode['id']
): Promise<string[]> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encodedHashes = await blockchain.api.query.attestation.delegatedAttestations<
    Vec<H256>
  >(id)
  return decodeDelegatedAttestations(encodedHashes)
}

/**
 * @param id
 * @internal
 */
export async function getChildIds(
  id: IDelegationBaseNode['id']
): Promise<string[]> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const childIds = await blockchain.api.query.delegation.children<Vec<H256>>(id)
  DecoderUtils.assertCodecIsType(childIds, ['Vec<DelegationNodeId>'])
  return childIds.map((hash) => hash.toString())
}

/**
 * @param childIds
 * @internal
 */
export async function fetchChildren(
  childIds: string[]
): Promise<Array<CodecWithId<Option<IChainDelegationNode>>>> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const val: Array<CodecWithId<
    Option<IChainDelegationNode>
  >> = await Promise.all(
    childIds.map(async (childId: string) => {
      const queryResult = await blockchain.api.query.delegation.delegations<
        Option<IChainDelegationNode>
      >(childId)
      return {
        id: childId,
        codec: queryResult,
      }
    })
  )
  return val
}
