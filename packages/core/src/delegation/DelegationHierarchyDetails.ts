/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * KILT enables top-down trust structures.
 * On the lowest level, a delegation structure is always a **tree**.
 * Each tree represents a delegation **hierarchy**, to each of which there are details associated.
 *
 * @packageDocumentation
 * @module DelegationHierarchyDetails
 * @preferred
 */

import { ConfigService } from '@kiltprotocol/config'
import type {
  ICType,
  IDelegationHierarchyDetails,
  IDelegationNode,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { query, store } from './DelegationHierarchyDetails.chain'

const log = ConfigService.LoggingFactory.getLogger('DelegationRootNode')

export default class DelegationHierarchyDetails
  implements IDelegationHierarchyDetails {
  public rootId: IDelegationNode['id']
  public cTypeHash: ICType['hash']

  /**
   * Builds a new [DelegationHierarchy] instance.
   *
   * @param delegationHierarchyInput - The base object from which to create the delegation base node.
   */
  public constructor(delegationHierarchyInput: IDelegationHierarchyDetails) {
    this.rootId = delegationHierarchyInput.rootId
    this.cTypeHash = delegationHierarchyInput.cTypeHash
  }

  public static async query(
    rootId: IDelegationNode['id']
  ): Promise<DelegationHierarchyDetails | null> {
    log.info(`:: query('${rootId}')`)
    const result = await query(rootId)
    if (result) {
      log.info(`result: ${JSON.stringify(result)}`)
    } else {
      log.info(`Delegation hierarchy not found`)
    }

    return result
  }

  public async store(): Promise<SubmittableExtrinsic> {
    log.debug(`:: store(${this.rootId})`)
    return store(this)
  }
}
