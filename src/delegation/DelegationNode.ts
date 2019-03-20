import { SubmittableExtrinsic } from '@polkadot/api'
import { CodecResult } from '@polkadot/api/promise/types'
import { Option, Text } from '@polkadot/types'
import Blockchain, { QueryResult } from '../blockchain/Blockchain'
import { TxStatus } from '../blockchain/TxStatus'
import { coToUInt8, hash, u8aConcat, u8aToHex } from '../crypto/Crypto'
import Identity from '../identity/Identity'
import { IPublicIdentity } from '../identity/PublicIdentity'
import { factory } from '../config/ConfigLog'
import {
  DelegationBaseNode,
  IDelegationBaseNode,
  IDelegationRootNode,
  IDelegationNode,
  Permission,
} from './Delegation'
import { decodeDelegationNode } from './DelegationDecoder'
import { DelegationRootNode } from './DelegationRootNode'

const log = factory.getLogger('DelegationNode')

export class DelegationNode extends DelegationBaseNode
  implements IDelegationNode {
  public static async query(
    blockchain: Blockchain,
    delegationId: IDelegationBaseNode['id']
  ): Promise<IDelegationNode | undefined> {
    log.debug(
      () => `Query chain for delegation with identifier ${delegationId}`
    )
    const decoded: IDelegationNode | undefined = decodeDelegationNode(
      await blockchain.api.query.delegation.delegations(delegationId)
    )
    if (decoded) {
      decoded.id = delegationId
    }
    return decoded
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

  public async getRoot(blockchain: Blockchain): Promise<IDelegationRootNode> {
    const rootNode:
      | IDelegationRootNode
      | undefined = await DelegationRootNode.query(blockchain, this.rootId)
    if (!rootNode) {
      throw new Error(`Could not find root node with id ${this.rootId}`)
    }
    return rootNode as IDelegationRootNode
  }

  public async getParent(
    blockchain: Blockchain
  ): Promise<IDelegationBaseNode | undefined> {
    if (this.parentId === undefined) {
      // parent must be root
      return await this.getRoot(blockchain)
    }
    return await DelegationNode.query(blockchain, this.parentId)
  }

  public async store(
    blockchain: Blockchain,
    identity: Identity,
    signature: string
  ): Promise<TxStatus> {
    const tx: SubmittableExtrinsic<
      CodecResult,
      any
    > = await blockchain.api.tx.delegation.addDelegation(
      this.id,
      this.rootId,
      new Option(Text, this.parentId),
      this.account,
      this.permissionsAsBitset(),
      signature
    )
    return blockchain.submitTx(identity, tx)
  }

  protected decodeChildNode(
    queryResult: QueryResult
  ): IDelegationNode | undefined {
    return decodeDelegationNode(queryResult)
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
