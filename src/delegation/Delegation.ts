import { SubmittableExtrinsic } from '@polkadot/api'
import { CodecResult } from '@polkadot/api/promise/types'
import { Option, Text } from '@polkadot/types'
import Identity from '../identity/Identity'
import { TxStatus } from '../blockchain/TxStatus'
import Blockchain from '../blockchain/Blockchain'
import { factory } from '../config/ConfigLog'
import { ICType } from '../ctype/CType'
import { IPublicIdentity } from '../identity/PublicIdentity'
import { decodeDelegationNode, decodeRootDelegation } from './DelegationDecoder'
import { hash, coToUInt8, u8aToHex, u8aConcat } from '../crypto/Crypto'

const log = factory.getLogger('Delegation')

export enum Permission {
  ATTEST = 1 << 0, // 0001
  DELEGATE = 1 << 1, // 0010
}

export interface IDelegationBaseNode {
  id: string
  account: IPublicIdentity['address']
  revoked: boolean
  getRoot(blockchain: Blockchain): Promise<IDelegationRootNode>
  getParent(blockchain: Blockchain): Promise<IDelegationBaseNode> | null
  getChildren(blockchain: Blockchain): Promise<IDelegationNode[]>
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
  ): Promise<IDelegationBaseNode> | null

  public getChildren(blockchain: Blockchain): Promise<IDelegationNode[]> {
    throw new Error('not implemented')
  }
}

export class DelegationNode extends DelegationBaseNode
  implements IDelegationNode {
  public static async query(
    blockchain: Blockchain,
    delegationId: IDelegationBaseNode['id']
  ): Promise<IDelegationNode | undefined> {
    log.debug(
      () => `Query chain for delegation with identifier ${delegationId}`
    )
    return decodeDelegationNode(
      await blockchain.api.query.delegation.delegations(delegationId)
    )
  }

  public rootId: IDelegationBaseNode['id']
  public parentId?: IDelegationBaseNode['id']
  public permissions: Permission[]

  constructor(
    id: IDelegationBaseNode['id'],
    rootId: IDelegationBaseNode['id'],
    account: IPublicIdentity['address'],
    permissions: Permission[],
    parentId?: IDelegationBaseNode['id']
  ) {
    super(id, account)
    this.permissions = permissions
    this.rootId = rootId
    this.parentId = parentId
  }

  public generateHash(): string {
    const uint8Props: Uint8Array[] = []
    uint8Props.push(coToUInt8(this.id))
    uint8Props.push(coToUInt8(this.rootId))
    if (this.parentId) {
      uint8Props.push(coToUInt8(this.parentId))
    }
    uint8Props.push(this.permissionsAsBitset())
    return u8aToHex(hash(u8aConcat(...uint8Props)))
  }

  public getRoot(blockchain: Blockchain): Promise<IDelegationRootNode> {
    throw new Error('not implemented')
  }
  public getParent(
    blockchain: Blockchain
  ): Promise<IDelegationBaseNode> | null {
    throw new Error('not implemented')
  }

  public async store(
    blockchain: Blockchain,
    identity: Identity,
    signature: string
  ): Promise<TxStatus> {
    const tx: SubmittableExtrinsic<CodecResult, any> =
      // @ts-ignore
      await blockchain.api.tx.delegation.addDelegation(
        this.id,
        this.rootId,
        new Option(Text, this.parentId),
        this.account,
        this.permissionsAsBitset(),
        signature
      )
    return blockchain.submitTx(identity, tx)
  }

  /**
   * Creates a bitset from the permissions in the array where each enum value
   * is used to set the bit flag in the set.
   *
   * ATTEST has `0001`  (decimal 1)
   * DELEGATE has `0010` (decimal 2)
   *
   * Adding the enum values results in a decimal representation of the bitset.
   *
   * @returns the bitset as single value uint8 array
   */
  private permissionsAsBitset(): Uint8Array {
    const permisssionsAsBitset: number = this.permissions.reduce(
      (accumulator, currentValue) => accumulator + currentValue
    )
    const uint8: Uint8Array = new Uint8Array(1)
    uint8[0] = permisssionsAsBitset
    return uint8
  }
}

export class DelegationRootNode extends DelegationBaseNode
  implements IDelegationRootNode {
  public static async query(
    blockchain: Blockchain,
    delegationId: IDelegationBaseNode['id']
  ): Promise<IDelegationRootNode | undefined> {
    log.debug(
      () => `Query chain for root delegation with identifier ${delegationId}`
    )
    const root: Partial<IDelegationRootNode | undefined> = decodeRootDelegation(
      await blockchain.api.query.delegation.root(delegationId)
    )
    if (root) {
      root.id = delegationId
      return root as IDelegationRootNode
    }
    return undefined
  }

  public cTypeHash: ICType['hash']

  constructor(
    id: IDelegationBaseNode['id'],
    ctypeHash: ICType['hash'],
    account: IPublicIdentity['address']
  ) {
    super(id, account)
    this.cTypeHash = ctypeHash
  }

  public getRoot(blockchain: Blockchain): Promise<IDelegationRootNode> {
    return Promise.resolve(this)
  }
  public getParent(
    blockchain: Blockchain
  ): Promise<IDelegationBaseNode> | null {
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
