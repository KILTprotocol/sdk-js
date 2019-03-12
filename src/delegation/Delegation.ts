import { SubmittableExtrinsic } from '@polkadot/api'
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import { Codec } from '@polkadot/types/types'
import Blockchain from '../blockchain/Blockchain'
import { BlockchainStorable } from '../blockchain/BlockchainStorable'
import { factory } from '../config/ConfigLog'
import { ICType } from '../ctype/CType'
import { IPublicIdentity } from '../identity/PublicIdentity'

const log = factory.getLogger('Delegation')

export interface IDelegationBaseNode {
  id: string
  account?: IPublicIdentity['address']
  revoked: boolean
  getRoot(): Promise<IDelegationRootNode>
  getParent(): Promise<IDelegationBaseNode> | null
  getChildren(): Promise<IDelegationNode[]>
}

export interface IDelegationRootNode extends IDelegationBaseNode {
  ctypeHash: ICType['hash']
}

export interface IDelegationNode {
  permissions: string[]
}

export abstract class DelegationBaseNode
  extends BlockchainStorable<IDelegationRootNode | IDelegationNode>
  implements IDelegationBaseNode {
  public id: IDelegationBaseNode['id']
  public account?: IPublicIdentity['address']
  public revoked: boolean = false

  public constructor(id: IDelegationBaseNode['id']) {
    super()
    this.id = id
  }

  public getIdentifier(): string {
    return this.id
  }

  public abstract getRoot(): Promise<IDelegationRootNode>

  public abstract getParent(): Promise<IDelegationBaseNode> | null

  public getChildren(): Promise<IDelegationNode[]> {
    throw new Error('not implemented')
  }
}

export class DelegationNode extends DelegationBaseNode
  implements IDelegationNode {
  public permissions: string[]

  constructor(
    id: IDelegationBaseNode['id'],
    account?: IPublicIdentity['address'],
    permissions?: string[]
  ) {
    super(id)
    this.account = account
    this.permissions = permissions || []
  }

  public getRoot(): Promise<IDelegationRootNode> {
    throw new Error('not implemented')
  }
  public getParent(): Promise<IDelegationBaseNode> | null {
    throw new Error('not implemented')
  }

  protected queryRaw(
    blockchain: Blockchain,
    identifier: string
  ): Promise<Codec | null | undefined> {
    throw new Error('not implemented.')
  }

  protected decode(
    encoded: Codec | null | undefined,
    identifier: string
  ): IDelegationNode {
    log.debug(`decode(): encoded: ${encoded}`)
    throw new Error('not implemented')
  }

  protected createTransaction(
    blockchain: Blockchain
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>> {
    throw new Error('not implemented')
  }
}

export class DelegationRootNode extends DelegationBaseNode
  implements IDelegationRootNode {
  public ctypeHash: ICType['hash']

  constructor(
    id: IDelegationBaseNode['id'],
    ctypeHash?: ICType['hash'],
    account?: IPublicIdentity['address']
  ) {
    super(id)
    this.account = account
    this.ctypeHash = ctypeHash
  }

  public getRoot(): Promise<IDelegationRootNode> {
    return Promise.resolve(this)
  }
  public getParent(): Promise<IDelegationBaseNode> | null {
    return null
  }

  protected async queryRaw(
    blockchain: Blockchain,
    identifier: string
  ): Promise<Codec | null | undefined> {
    log.debug(
      () => `Query chain for root delegation with identifier ${identifier}`
    )
    const result:
      | Codec
      | null
      | undefined = await blockchain.api.query.delegation.root(identifier)
    log.debug(() => `Result: ${result}`)
    return result
  }

  protected decode(
    encoded: Codec | null | undefined,
    identifier: string
  ): IDelegationRootNode {
    log.debug(`DelegationRootNode.decode(): encoded: ${encoded}`)
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    log.debug(`DelegationRootNode as JSON: ${json}`)
    const delegationRootNode: IDelegationRootNode = json.map((tuple: any[]) => {
      return {
        id: identifier,
        ctypeHash: tuple[0],
        account: tuple[1],
        revoked: tuple[2],
      } as IDelegationRootNode
    })[0]
    console.log(
      `Decoded delegation root node: ${JSON.stringify(delegationRootNode)}`
    )
    return delegationRootNode
  }

  protected createTransaction(
    blockchain: Blockchain
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>> {
    if (!this.ctypeHash) {
      log.error(`Missing CTYPE hash in delegation ${this.getIdentifier()}`)
      throw new Error('No CTYPE hash found for delegation.')
    }
    log.debug(() => `Create tx for 'delegation.createRoot'`)
    // @ts-ignore
    return blockchain.api.tx.delegation.createRoot(
      this.getIdentifier(),
      this.ctypeHash
    )
  }
}
