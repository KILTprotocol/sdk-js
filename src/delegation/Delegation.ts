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
  account: IPublicIdentity['address']
  getRoot(): IDelegationRootNode
  getParent(): IDelegationBaseNode | null
  getChildren(): IDelegationNode[]
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
  public account: IPublicIdentity['address']

  public constructor(
    id: IDelegationBaseNode['id'],
    account: IPublicIdentity['address']
  ) {
    super()
    this.id = id
    this.account = account
  }

  public getHash(): string {
    return this.id
  }

  public abstract getRoot(): IDelegationRootNode

  public abstract getParent(): IDelegationBaseNode | null

  public getChildren(): IDelegationNode[] {
    throw new Error('not implemented')
  }
}

export class DelegationNode extends DelegationBaseNode
  implements IDelegationNode {
  public permissions: string[]

  constructor(
    id: IDelegationBaseNode['id'],
    account: IPublicIdentity['address'],
    permissions: string[]
  ) {
    super(id, account)
    this.permissions = permissions
  }

  public getRoot(): IDelegationRootNode {
    throw new Error('not implemented')
  }
  public getParent(): IDelegationBaseNode | null {
    throw new Error('not implemented')
  }

  protected queryRaw(
    blockchain: Blockchain,
    hash: string
  ): Promise<Codec | null | undefined> {
    throw new Error('not implemented.')
  }

  protected decode(encoded: Codec | null | undefined): IDelegationNode {
    log.debug(`decode(): encoded: ${encoded}`)
    throw new Error('not implemented')
  }

  protected createTransaction(
    blockchain: Blockchain,
    signature: Uint8Array
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>> {
    throw new Error('not implemented')
  }
}

export class DelegationRootNode extends DelegationBaseNode
  implements IDelegationRootNode {
  public ctypeHash: ICType['hash']

  constructor(
    id: IDelegationBaseNode['id'],
    ctypeHash: ICType['hash'],
    account: IPublicIdentity['address']
  ) {
    super(id, account)
    this.ctypeHash = ctypeHash
  }

  public getRoot(): IDelegationRootNode {
    return this
  }
  public getParent(): IDelegationBaseNode | null {
    return null
  }

  protected queryRaw(
    blockchain: Blockchain,
    hash: string
  ): Promise<Codec | null | undefined> {
    throw new Error('not implemented')
  }

  protected decode(encoded: Codec | null | undefined): IDelegationRootNode {
    log.debug(`decode(): encoded: ${encoded}`)
    throw new Error('not implemented')
  }

  protected createTransaction(
    blockchain: Blockchain,
    signature: Uint8Array
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>> {
    throw new Error('not implemented')
  }
}
