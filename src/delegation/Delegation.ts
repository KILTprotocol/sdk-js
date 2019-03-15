import { SubmittableExtrinsic } from '@polkadot/api'
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import { Codec } from '@polkadot/types/types'

import Blockchain from '../blockchain/Blockchain'
import { BlockchainStorable } from '../blockchain/BlockchainStorable'
import { factory } from '../config/ConfigLog'
import { ICType } from '../ctype/CType'
import { IPublicIdentity } from '../identity/PublicIdentity'
import { Option, Text } from '@polkadot/types'

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
  rootId: IDelegationBaseNode['id']
  parentId?: IDelegationBaseNode['id']
  signature: string
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
  public rootId: IDelegationBaseNode['id']
  public parentId: IDelegationBaseNode['id']
  public signature: string
  public permissions: Permission[]

  constructor(
    id: IDelegationBaseNode['id'],
    rootId: IDelegationBaseNode['id'],
    parentId: IDelegationBaseNode['id'],
    signature: string,
    account?: IPublicIdentity['address'],
    permissions?: Permission[]
  ) {
    super(id)
    this.account = account
    this.permissions = permissions || []
    this.rootId = rootId
    this.parentId = parentId
    this.signature = signature
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
    // Delegations: delegation-id => (root-id, parent-id?, account, permissions, revoked)
    log.debug(() => `Query chain for delegation with identifier ${identifier}`)
    return blockchain.api.query.delegation.delegation(identifier)
  }

  protected decode(
    encoded: Codec | null | undefined,
    identifier: string
  ): IDelegationNode {
    log.debug(`decode(): encoded: ${encoded}`)
    // (T::DelegationNodeId,Option<T::DelegationNodeId>,T::AccountId,Permissions,bool)
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    const delegationRootNode: IDelegationNode = json.map((tuple: any[]) => {
      return {
        id: tuple[0],
        parentId: tuple[1],
        account: tuple[1],
        permissions: tuple[2],
        revoked: tuple[3],
      } as IDelegationNode
    })[0]
    log.info(`Decoded delegation root: ${JSON.stringify(delegationRootNode)}`)
    return delegationRootNode
    throw new Error('not implemented')
  }

  protected createTransaction(
    blockchain: Blockchain
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>> {
    // @ts-ignore
    // pub fn add_delegation(origin, delegation_id: T::DelegationNodeId,
    //   root_id: T::DelegationNodeId, parent_id: Option<T::DelegationNodeId>,
    //   delegate: T::AccountId, permissions: Permissions, delegate_signature: T::Signature) -> Result {
    return blockchain.api.tx.delegation.addDelegation(
      this.getIdentifier(),
      this.rootId,
      new Option(Text, this.parentId),
      this.account,
      this.permissions,
      this.signature
    )
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
