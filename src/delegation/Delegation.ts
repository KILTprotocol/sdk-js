import Blockchain, { QueryResult } from '../blockchain/Blockchain'
import { factory } from '../config/ConfigLog'
import { ICType } from '../ctype/CType'
import { IPublicIdentity } from '../identity/PublicIdentity'
import { CodecWithId } from './DelegationDecoder'
import Attestation, { IAttestation } from '../attestation/Attestation'

const log = factory.getLogger('DelegationBaseNode')

export enum Permission {
  ATTEST = 1 << 0, // 0001
  DELEGATE = 1 << 1, // 0010
}

export interface IDelegationBaseNode {
  id: string
  account: IPublicIdentity['address']
  revoked: boolean
  getRoot(blockchain: Blockchain): Promise<IDelegationRootNode>
  getParent(blockchain: Blockchain): Promise<IDelegationBaseNode | undefined>
  getChildren(blockchain: Blockchain): Promise<IDelegationNode[]>
  getAttestations(blockchain: Blockchain): Promise<IAttestation[]>
  getAttestationHashes(blockchain: Blockchain): Promise<string[]>
  verify(blockchain: Blockchain): Promise<boolean>
}

export interface IDelegationRootNode extends IDelegationBaseNode {
  cTypeHash: ICType['hash']
}

export interface IDelegationNode extends IDelegationBaseNode {
  rootId: IDelegationBaseNode['id']
  parentId?: IDelegationBaseNode['id']
  permissions: Permission[]

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

  public id: IDelegationBaseNode['id']
  public account: IPublicIdentity['address']
  public revoked: boolean = false

  public constructor(
    id: IDelegationBaseNode['id'],
    account: IPublicIdentity['address']
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
