/**
 * KILT enables top-down trust structures (see [[Delegation]]). On the lowest level, a delegation structure is always a **tree**. The root of this tree is DelegationRootNode.
 * ***
 * Apart from inheriting [[DelegationBaseNode]]'s structure, a DelegationRootNode has a [[cTypeHash]] property that refers to a specific [[CType]]. A DelegationRootNode is written on-chain, and can be queried by [[delegationId]] via the [[query]] method.
 * ***
 * @module Delegation/DelegationRootNode
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove
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
   * @returns promise containing [[DelegationRootNode]] or [null]
   */
  public static async query(
    delegationId: string
  ): Promise<DelegationRootNode | null> {
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

  public constructor(
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

  /* eslint-disable class-methods-use-this */
  public getParent(): Promise<DelegationBaseNode | null> {
    return Promise.resolve(null)
  }
  /* eslint-enable class-methods-use-this */

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
    const node = await query(this.id)
    return node !== null && !node.revoked
  }

  /**
   * @see [[DelegationBaseNode#revoke]]
   */
  public async revoke(identity: Identity): Promise<TxStatus> {
    log.debug(`:: revoke(${this.id})`)
    return revoke(this, identity)
  }

  /* eslint-disable class-methods-use-this */
  protected decodeChildNode(queryResult: QueryResult): DelegationNode | null {
    return decodeDelegationNode(queryResult)
  }
  /* eslint-enable class-methods-use-this */
}
