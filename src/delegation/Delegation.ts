import { SubmittableExtrinsic } from '@polkadot/api'
import { CodecResult } from '@polkadot/api/promise/types'
import { Option, Text } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { Identity } from 'src'
import { TxStatus } from 'src/blockchain/TxStatus'
import Blockchain from '../blockchain/Blockchain'
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
  rootId: IDelegationBaseNode['id']
  parentId?: IDelegationBaseNode['id']
  signature: string
  permissions: Permission[]
}

export abstract class DelegationBaseNode implements IDelegationBaseNode {
  public id: IDelegationBaseNode['id']
  public account?: IPublicIdentity['address']
  public revoked: boolean = false

  public constructor(id: IDelegationBaseNode['id']) {
    this.id = id
  }

  public abstract getRoot(): Promise<IDelegationRootNode>

  public abstract getParent(): Promise<IDelegationBaseNode> | null

  public getChildren(): Promise<IDelegationNode[]> {
    throw new Error('not implemented')
  }
}

export class DelegationNode extends DelegationBaseNode
  implements IDelegationNode {
  public static async query(
    blockchain: Blockchain,
    delegationId: IDelegationBaseNode['id']
  ): Promise<IDelegationNode> {
    // Delegations: delegation-id => (root-id, parent-id?, account, permissions, revoked)
    log.debug(
      () => `Query chain for delegation with identifier ${delegationId}`
    )
    const encoded:
      | Codec
      | null
      | undefined = await blockchain.api.query.delegation.delegation(
      delegationId
    )
    return DelegationNode.decode(encoded)
  }

  public static decode(encoded: Codec | null | undefined): IDelegationNode {
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

  public async store(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus> {
    const tx: SubmittableExtrinsic<CodecResult, any> =
      // @ts-ignore
      // pub fn add_delegation(origin, delegation_id: T::DelegationNodeId,
      //   root_id: T::DelegationNodeId, parent_id: Option<T::DelegationNodeId>,
      //   delegate: T::AccountId, permissions: Permissions, delegate_signature: T::Signature) -> Result {
      await blockchain.api.tx.delegation.addDelegation(
        this.id,
        this.rootId,
        new Option(Text, this.parentId),
        this.account,
        this.permissions,
        this.signature
      )
    return blockchain.submitTx(identity, tx)
  }
}

export class DelegationRootNode extends DelegationBaseNode
  implements IDelegationRootNode {
  public static async query(
    blockchain: Blockchain,
    delegationId: IDelegationBaseNode['id']
  ): Promise<IDelegationRootNode> {
    log.debug(
      () => `Query chain for root delegation with identifier ${delegationId}`
    )
    const encoded:
      | Codec
      | null
      | undefined = await blockchain.api.query.delegation.root(delegationId)
    const root: IDelegationRootNode = DelegationRootNode.decode(encoded)
    root.id = delegationId
    return root
  }

  public static decode(encoded: Codec | null | undefined): IDelegationRootNode {
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    const delegationRootNode: IDelegationRootNode = json.map((tuple: any[]) => {
      return {
        cTypeHash: tuple[0],
        account: tuple[1],
        revoked: tuple[2],
      } as IDelegationRootNode
    })[0]
    log.info(`Decoded delegation root: ${JSON.stringify(delegationRootNode)}`)
    return delegationRootNode
  }
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

  public async store(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus> {
    if (!this.cTypeHash) {
      log.error(`Missing CTYPE hash in delegation ${this.id}`)
      throw new Error('No CTYPE hash found for delegation.')
    }
    log.debug(() => `Create tx for 'delegation.createRoot'`)
    const tx: SubmittableExtrinsic<CodecResult, any> =
      // @ts-ignore
      await blockchain.api.tx.delegation.createRoot(this.id, this.cTypeHash)
    return blockchain.submitTx(identity, tx)
  }
}
