/**
 * @module Delegation/DelegationRootNode
 */
import { QueryResult } from '../blockchain/Blockchain'
import { TxStatus } from '../blockchain/TxStatus'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import DelegationBaseNode from './Delegation'
import { decodeDelegationNode } from './DelegationDecoder'
import { IDelegationRootNode } from '../types/Delegation'
import DelegationNode from './DelegationNode'
import { store, query, revoke } from './DelegationRootNode.chain'

const log = factory.getLogger('DelegationRootNode')

export default class DelegationRootNode extends DelegationBaseNode
  implements IDelegationRootNode {
  public static async query(delegationId: string) {
    log.info(`:: query('${delegationId}')`)
    const result = await query(delegationId)
    if (result) {
      log.info(`result: ${JSON.stringify(result)}`)
    } else {
      log.info(`root node not found`)
    }

    return result
  }

  public cTypeHash: IDelegationRootNode['cTypeHash']

  constructor(
    id: IDelegationRootNode['id'],
    ctypeHash: IDelegationRootNode['cTypeHash'],
    account: IDelegationRootNode['account']
  ) {
    super(id, account)
    this.cTypeHash = ctypeHash
  }

  public getRoot(): Promise<DelegationRootNode> {
    return Promise.resolve(this)
  }
  // tslint:disable-next-line:prefer-function-over-method
  public getParent(): Promise<DelegationBaseNode | undefined> {
    return Promise.resolve(undefined)
  }

  public async store(identity: Identity): Promise<TxStatus> {
    log.debug(`:: store(${this.id})`)
    return store(this, identity)
  }

  public async verify(): Promise<boolean> {
    const node: IDelegationRootNode | undefined = await query(this.id)
    return node !== undefined && !node.revoked
  }

  public async revoke(identity: Identity): Promise<TxStatus> {
    log.debug(`:: revoke(${this.id})`)
    return revoke(this, identity)
  }

  protected decodeChildNode(
    queryResult: QueryResult
  ): DelegationNode | undefined {
    return decodeDelegationNode(queryResult)
  }
}
