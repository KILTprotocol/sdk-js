import Blockchain, { QueryResult } from '../blockchain/Blockchain'
import { factory } from '../config/ConfigLog'
import { ICType } from '../ctype/CType'
import { IPublicIdentity } from '../identity/PublicIdentity'
import { CodecWithId } from './DelegationDecoder'

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
    const queryResults: CodecWithId[] = await this.fetchChildren(
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

  public abstract verify(blockchain: Blockchain): Promise<boolean>

  /**
   * Required to avoid cyclic dependencies btw. DelegationBaseNode and DelegationNode implementations.
   */
  protected abstract decodeChildNode(
    queryResult: QueryResult
  ): IDelegationNode | undefined

  private async fetchChildren(
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
}
