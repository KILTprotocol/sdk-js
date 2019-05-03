import Blockchain, { QueryResult } from '../blockchain/Blockchain'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import { CodecWithId } from './DelegationDecoder'
import Attestation from '../attestation/Attestation'
import { TxStatus } from '../blockchain/TxStatus'

import { IDelegationBaseNode } from '../primitives/Delegation'
import { DelegationNode } from './DelegationNode'
import { DelegationRootNode } from './DelegationRootNode'

const log = factory.getLogger('DelegationBaseNode')

export abstract class DelegationBaseNode implements IDelegationBaseNode {
  /**
   * Gets all attestations made by a Delegation Node.
   *
   * @param blockchain The blockchain object.
   *
   * @returns All attestations made by this Delegation Node.
   */
  public static async getAttestations(
    blockchain: Blockchain,
    id: IDelegationBaseNode['id']
  ): Promise<Attestation[]> {
    const attestationHashes = await DelegationBaseNode.getAttestationHashes(
      blockchain,
      id
    )
    const attestations = await Promise.all(
      attestationHashes.map((claimHash: string) => {
        return Attestation.query(blockchain, claimHash)
      })
    )

    return attestations.filter((value): value is Attestation => !!value)
  }

  public static async getAttestationHashes(
    blockchain: Blockchain,
    id: IDelegationBaseNode['id']
  ): Promise<string[]> {
    const encodedHashes = await blockchain.api.query.attestation.delegatedAttestations(
      id
    )
    return DelegationBaseNode.decodeDelegatedAttestations(encodedHashes)
  }

  public id: IDelegationBaseNode['id']
  public account: IDelegationBaseNode['account']
  public revoked: IDelegationBaseNode['revoked'] = false

  public constructor(
    id: IDelegationBaseNode['id'],
    account: IDelegationBaseNode['account']
  ) {
    this.account = account
    this.id = id
  }

  public abstract getRoot(blockchain: Blockchain): Promise<DelegationRootNode>

  public abstract getParent(
    blockchain: Blockchain
  ): Promise<DelegationBaseNode | undefined>

  public async getChildren(blockchain: Blockchain): Promise<DelegationNode[]> {
    log.info(` :: getChildren('${this.id}')`)
    const childIds: string[] = Blockchain.asArray(
      await blockchain.api.query.delegation.children(this.id)
    )
    const queryResults: CodecWithId[] = await DelegationBaseNode.fetchChildren(
      childIds,
      blockchain
    )
    const children: DelegationNode[] = queryResults
      .map((codec: CodecWithId) => {
        const decoded: DelegationNode | undefined = this.decodeChildNode(
          codec.codec
        )
        if (decoded) {
          decoded.id = codec.id
        }
        return decoded
      })
      .filter(
        (value): value is DelegationNode => {
          return value !== undefined
        }
      )
    log.info(`children: ${JSON.stringify(children)}`)
    return children
  }

  /**
   * Gets all attestations made by a Delegation Node.
   *
   * @param blockchain The blockchain object.
   *
   * @returns All attestations made by this Delegation Node.
   */
  public async getAttestations(blockchain: Blockchain): Promise<Attestation[]> {
    return DelegationBaseNode.getAttestations(blockchain, this.id)
  }

  public async getAttestationHashes(blockchain: Blockchain): Promise<string[]> {
    return DelegationBaseNode.getAttestationHashes(blockchain, this.id)
  }

  public abstract verify(blockchain: Blockchain): Promise<boolean>

  public abstract revoke(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus>

  /**
   * Required to avoid cyclic dependencies btw. DelegationBaseNode and DelegationNode implementations.
   */
  protected abstract decodeChildNode(
    queryResult: QueryResult
  ): DelegationNode | undefined

  private static async fetchChildren(
    childIds: string[],
    blockchain: Blockchain
  ): Promise<CodecWithId[]> {
    const val: CodecWithId[] = await Promise.all(
      childIds.map(async (childId: string) => {
        const queryResult: QueryResult = await blockchain.api.query.delegation.delegations(
          childId
        )
        return {
          id: childId,
          codec: queryResult,
        } as CodecWithId
      })
    )
    return val
  }

  private static decodeDelegatedAttestations(
    queryResult: QueryResult
  ): string[] {
    const json =
      queryResult && queryResult.encodedLength ? queryResult.toJSON() : []
    return json
  }
}
