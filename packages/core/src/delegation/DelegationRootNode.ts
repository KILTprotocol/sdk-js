/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * KILT enables top-down trust structures.
 * On the lowest level, a delegation structure is always a **tree**.
 * The root of this tree is DelegationRootNode.
 *
 * Apart from inheriting [[DelegationBaseNode]]'s structure, a DelegationRootNode has a [[cTypeHash]] property that refers to a specific [[CType]].
 * A DelegationRootNode is written on-chain, and can be queried by delegationId via the [[query]] method.
 *
 * @packageDocumentation
 * @module DelegationRootNode
 */

import type {
  IDelegationRootNode,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import DelegationBaseNode from './Delegation'
import DelegationNode from './DelegationNode'
import { getChildren } from './DelegationNode.chain'
import { query, revoke, store } from './DelegationRootNode.chain'
import errorCheck from './DelegationRootNode.utils'

const log = ConfigService.LoggingFactory.getLogger('DelegationRootNode')

export default class DelegationRootNode extends DelegationBaseNode
  implements IDelegationRootNode {
  /**
   * [STATIC] Queries the delegation root with ``delegationId``.
   *
   * @param delegationId Unique identifier of the delegation root.
   * @returns Promise containing [[DelegationRootNode]] or [null].
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

  /**
   * Creates a new [DelegationRootNode].
   *
   * @param delegationRootNodeInput - The base object from which to create the delegation base node.
   */
  public constructor(delegationRootNodeInput: IDelegationRootNode) {
    super(delegationRootNodeInput)
    this.cTypeHash = delegationRootNodeInput.cTypeHash
    errorCheck(this)
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
   * Stores the delegation root node on chain.
   *
   * @returns Promise containing the unsigned SubmittableExtrinsic.
   */
  public async store(): Promise<SubmittableExtrinsic> {
    log.debug(`:: store(${this.id})`)
    return store(this)
  }

  public async verify(): Promise<boolean> {
    const node = await query(this.id)
    return node !== null && !node.revoked
  }

  public async revoke(): Promise<SubmittableExtrinsic> {
    const childCount = await this.subtreeNodeCount()
    log.debug(`:: revoke(${this.id})`)
    return revoke(this, childCount + 1)
  }

  public async getChildren(): Promise<DelegationNode[]> {
    return getChildren(this.id)
  }
}
