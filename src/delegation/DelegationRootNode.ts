/**
 * @module Delegation/DelegationRootNode
 *
 *  --- Overview ---
 *
 *  The Delegation root node uses methods to embed itself on the chain and distribute communication either from a point or the endpoint.
 *  Using the delegation ID to find the root nodes.
 *
 *  --- Usage ---
 *
 *  Delegation nodes inherit by default the root node type.
 *  Creating a hierarchical delegation tree.
 *
 */
import { QueryResult } from '../blockchain/Blockchain'
import TxStatus from '../blockchain/TxStatus'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import { IDelegationRootNode } from '../types/Delegation'
import DelegationBaseNode from './Delegation'
import { query, revoke, store } from './DelegationRootNode.chain'
import DelegationNode from './DelegationNode'
import { decodeDelegationNode } from './DelegationDecoder'

const log = factory.getLogger('DelegationRootNode')

export default class DelegationRootNode extends DelegationBaseNode
  implements IDelegationRootNode {
  /**
   * @description Queries the delegation root with [delegationId].
   *
   * @param delegationId unique identifier of the delegation root
   * @returns promise containing [[DelegationRootNode]] or [undefined]
   */
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

  /**
   * @description Stores the delegation root node on chain.
   *
   * @param identity the account used to store the delegation root node
   * @returns promise containing the [[TxStatus]]
   */
  public async store(identity: Identity): Promise<TxStatus> {
    log.debug(`:: store(${this.id})`)
    return store(this, identity)
  }

  /**
   * @see [[DelegationBaseNode#verify]]
   */
  public async verify(): Promise<boolean> {
    const node: IDelegationRootNode | undefined = await query(this.id)
    return node !== undefined && !node.revoked
  }

  /**
   * @see [[DelegationBaseNode#revoke]]
   */
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
