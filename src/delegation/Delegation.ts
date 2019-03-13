import { SubmittableExtrinsic } from '@polkadot/api'
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import { Codec } from '@polkadot/types/types'

import Blockchain from '../blockchain/Blockchain'
import { BlockchainStorable } from '../blockchain/BlockchainStorable'
import { factory } from '../config/ConfigLog'
import { ICType } from '../ctype/CType'
import { IPublicIdentity } from '../identity/PublicIdentity'

const log = factory.getLogger('Delegation')

export enum Permission {
  ATTEST,
  DELEGATE,
}

export interface IDelegationBaseNode {
  id: string
  account?: IPublicIdentity['address']
  revoked: boolean
  getRoot(): Promise<IDelegationRootNode>
  getParent(): Promise<IDelegationBaseNode> | null
  getChildren(): Promise<IDelegationNode[]>
}

export interface IDelegationRootNode extends IDelegationBaseNode {
  cTypeHash: ICType['hash']
}

export interface IDelegationNode extends IDelegationBaseNode {
  permissions: Permission[]
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
  public permissions: Permission[]

  constructor(
    id: IDelegationBaseNode['id'],
    account?: IPublicIdentity['address'],
    permissions?: Permission[]
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
  public cTypeHash: ICType['hash']

  constructor(
    id: IDelegationBaseNode['id'],
    ctypeHash?: ICType['hash'],
    account?: IPublicIdentity['address']
  ) {
    super(id)
    this.account = account
    this.cTypeHash = ctypeHash
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
    return blockchain.api.query.delegation.root(identifier)
  }

  protected decode(
    encoded: Codec | null | undefined,
    identifier: string
  ): IDelegationRootNode {
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    const delegationRootNode: IDelegationRootNode = json.map((tuple: any[]) => {
      return {
        id: identifier,
        cTypeHash: tuple[0],
        account: tuple[1],
        revoked: tuple[2],
      } as IDelegationRootNode
    })[0]
    log.info(`Decoded delegation root: ${JSON.stringify(delegationRootNode)}`)
    return delegationRootNode
  }

  protected createTransaction(
    blockchain: Blockchain
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>> {
    if (!this.cTypeHash) {
      log.error(`Missing CTYPE hash in delegation ${this.getIdentifier()}`)
      throw new Error('No CTYPE hash found for delegation.')
    }
    log.debug(() => `Create tx for 'delegation.createRoot'`)
    // @ts-ignore
    return blockchain.api.tx.delegation.createRoot(
      this.getIdentifier(),
      this.cTypeHash
    )
  }
}
