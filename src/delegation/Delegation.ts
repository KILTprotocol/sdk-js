import Blockchain, { QueryResult } from '../blockchain/Blockchain'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import { CodecWithId } from './DelegationDecoder'
import Attestation, { IAttestation } from '../attestation/Attestation'
import { TxStatus } from '../blockchain/TxStatus'

import {
  IDelegationBaseNode as IDelegationBaseNodePrimitive,
  IDelegationNode as IDelegationNodePrimitive,
  IDelegationRootNode as IDelegationRootNodePrimitive,
} from '../primitives/Delegation'

const log = factory.getLogger('DelegationBaseNode')

export interface IDelegationBaseNode extends IDelegationBaseNodePrimitive {
  getRoot(blockchain: Blockchain): Promise<IDelegationRootNode>
  getParent(blockchain: Blockchain): Promise<IDelegationBaseNode | undefined>
  getChildren(blockchain: Blockchain): Promise<IDelegationNode[]>
  getAttestations(blockchain: Blockchain): Promise<IAttestation[]>
  getAttestationHashes(blockchain: Blockchain): Promise<string[]>
  verify(blockchain: Blockchain): Promise<boolean>

  /**
   * Revoke this delegation node and all its' children.
   */
  revoke(blockchain: Blockchain, identity: Identity): Promise<TxStatus>
}

export interface IDelegationRootNode
  extends IDelegationBaseNode,
    IDelegationRootNodePrimitive {}

export interface IDelegationNode
  extends IDelegationBaseNode,
    IDelegationNodePrimitive {
  /**
   * Generate hash of this nodes' properties for signing.
   */
  generateHash(): string
}

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
  ): Promise<IAttestation[]> {
    const attestationHashes = await DelegationBaseNode.getAttestationHashes(
      blockchain,
      id
    )
    const attestations = await Promise.all(
      attestationHashes.map((claimHash: string) => {
        return Attestation.query(blockchain, claimHash)
      })
    )

    return attestations.filter(Boolean) as IAttestation[]
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

  public id: IDelegationBaseNodePrimitive['id']
  public account: IDelegationBaseNodePrimitive['account']
  public revoked: IDelegationBaseNodePrimitive['revoked'] = false

  public constructor(
    id: IDelegationBaseNodePrimitive['id'],
    account: IDelegationBaseNodePrimitive['account']
  ) {
    this.account = account
    this.id = id
  }

  public abstract getRoot(blockchain: Blockchain): Promise<IDelegationRootNode>

  public abstract getParent(
    blockchain: Blockchain
  ): Promise<IDelegationBaseNode | undefined>

  public async getChildren(blockchain: Blockchain): Promise<IDelegationNode[]> {
    log.info(` :: getChildren('${this.id}')`)
    const childIds: string[] = Blockchain.asArray(
      await blockchain.api.query.delegation.children(this.id)
    )
    const queryResults: CodecWithId[] = await DelegationBaseNode.fetchChildren(
      childIds,
      blockchain
    )
    const children: IDelegationNode[] = queryResults
      .map((codec: CodecWithId) => {
        const decoded: IDelegationNode | undefined = this.decodeChildNode(
          codec.codec
        )
        if (decoded) {
          decoded.id = codec.id
        }
        return decoded
      })
      .map((node: IDelegationNode | undefined) => {
        return node as IDelegationNode
      })
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
  public async getAttestations(
    blockchain: Blockchain
  ): Promise<IAttestation[]> {
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
  ): IDelegationNode | undefined

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
