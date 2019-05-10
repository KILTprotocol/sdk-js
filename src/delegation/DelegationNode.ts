import Crypto from '../crypto'
import { QueryResult } from '../blockchain/Blockchain'
import { TxStatus } from '../blockchain/TxStatus'
import { factory } from '../config/ConfigLog'
import { coToUInt8, u8aConcat, u8aToHex } from '../crypto/Crypto'
import Identity from '../identity/Identity'
import DelegationBaseNode from './Delegation'
import { decodeDelegationNode } from './DelegationDecoder'
import DelegationRootNode from './DelegationRootNode'
import { IDelegationNode } from '../types/Delegation'
import { permissionsAsBitset } from './DelegationNode.utils'
import { query, store, revoke } from './DelegationNode.chain'
import { query as queryRoot } from './DelegationRootNode.chain'

const log = factory.getLogger('DelegationNode')

export default class DelegationNode extends DelegationBaseNode
  implements IDelegationNode {
  public static async query(delegationId: string) {
    log.info(`:: query('${delegationId}')`)
    const result = await query(delegationId)
    log.info(`result: ${JSON.stringify(result)}`)
    return result
  }

  public rootId: IDelegationNode['rootId']
  public parentId?: IDelegationNode['parentId']
  public permissions: IDelegationNode['permissions']

  constructor(
    id: IDelegationNode['id'],
    rootId: IDelegationNode['rootId'],
    account: IDelegationNode['account'],
    permissions: IDelegationNode['permissions'],
    parentId?: IDelegationNode['parentId']
  ) {
    super(id, account)
    this.permissions = permissions
    this.rootId = rootId
    this.parentId = parentId
  }

  public generateHash(): string {
    const propsToHash: Array<Uint8Array | string> = [this.id, this.rootId]
    if (this.parentId && this.parentId !== this.rootId) {
      propsToHash.push(this.parentId)
    }
    const uint8Props: Uint8Array[] = propsToHash.map(value => {
      return coToUInt8(value)
    })
    uint8Props.push(permissionsAsBitset(this))
    const generated: string = u8aToHex(
      Crypto.hash(u8aConcat(...uint8Props), 256)
    )
    log.debug(`generateHash(): ${generated}`)
    return generated
  }

  public async getRoot(): Promise<DelegationRootNode> {
    const rootNode = await queryRoot(this.rootId)
    if (!rootNode) {
      throw new Error(`Could not find root node with id ${this.rootId}`)
    }
    return rootNode
  }

  public async getParent(): Promise<DelegationBaseNode | undefined> {
    if (!this.parentId) {
      // parent must be root
      return await this.getRoot()
    }
    return await query(this.parentId)
  }

  public async store(identity: Identity, signature: string): Promise<TxStatus> {
    log.info(`:: store(${this.id})`)
    return store(this, identity, signature)
  }

  public async verify(): Promise<boolean> {
    const node: DelegationNode | undefined = await query(this.id)
    return node !== undefined && !node.revoked
  }

  public async revoke(identity: Identity): Promise<TxStatus> {
    log.debug(`:: revoke(${this.id})`)
    return revoke(this.id, identity)
  }

  public permissionsAsBitset() {
    return permissionsAsBitset(this)
  }

  protected decodeChildNode(
    queryResult: QueryResult
  ): DelegationNode | undefined {
    return decodeDelegationNode(queryResult)
  }
}
