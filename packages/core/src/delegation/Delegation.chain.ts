/**
 * @packageDocumentation
 * @module DelegationBaseNode
 */

import type { Option, Vec } from '@polkadot/types'
import type { Hash } from '@polkadot/types/interfaces'
import type { IDelegationBaseNode } from '@kiltprotocol/types'
import { DecoderUtils } from '@kiltprotocol/utils'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type { CodecWithId, IChainDelegationNode } from './DelegationDecoder'

function decodeDelegatedAttestations(queryResult: Option<Vec<Hash>>): string[] {
  DecoderUtils.assertCodecIsType(queryResult, ['Option<Vec<ClaimHashOf>>'])
  return queryResult.unwrapOrDefault().map((hash) => hash.toHex())
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
    Option<Vec<Hash>>
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
  const childIds = await blockchain.api.query.delegation.children<
    Option<Vec<Hash>>
  >(id)
  DecoderUtils.assertCodecIsType(childIds, ['Option<Vec<DelegationNodeIdOf>>'])
  return childIds.unwrapOrDefault().map((hash) => hash.toHex())
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
