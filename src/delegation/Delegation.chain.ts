import { getCached } from '../blockchainApiConnection'
import Blockchain, { QueryResult } from '../blockchain/Blockchain'
import { CodecWithId } from '../delegation/DelegationDecoder'
import { IDelegationBaseNode } from '../types/Delegation'

export async function getAttestationHashes(
  id: IDelegationBaseNode['id']
): Promise<string[]> {
  const blockchain = await getCached()
  const encodedHashes = await blockchain.api.query.attestation.delegatedAttestations(
    id
  )
  return decodeDelegatedAttestations(encodedHashes)
}

function decodeDelegatedAttestations(queryResult: QueryResult): string[] {
  const json =
    queryResult && queryResult.encodedLength ? queryResult.toJSON() : []
  return json
}

export async function getChildIds(
  id: IDelegationBaseNode['id']
): Promise<string[]> {
  const blockchain = await getCached()
  return Blockchain.asArray(await blockchain.api.query.delegation.children(id))
}

export async function fetchChildren(
  childIds: string[]
): Promise<CodecWithId[]> {
  const blockchain = await getCached()
  const val: CodecWithId[] = await Promise.all(
    childIds.map(async (childId: string) => {
      const queryResult: QueryResult = await blockchain.api.query.delegation.delegations(
        childId
      )
      return {
        id: childId,
        codec: queryResult,
      }
    })
  )
  return val
}
