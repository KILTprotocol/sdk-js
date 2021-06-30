/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Delegation nodes are used within the KILT protocol to construct the trust hierarchy.
 *
 * Starting from the root node, entities can delegate the right to issue attestations to Claimers for a certain CTYPE and also delegate the right to attest and to delegate further nodes.
 *
 * @packageDocumentation
 * @module DelegationNode
 * @preferred
 */

import type { IDelegationNode, SubmittableExtrinsic } from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import DelegationBaseNode from './Delegation'
import { getChildren, query, revoke, store } from './DelegationNode.chain'
import * as DelegationNodeUtils from './DelegationNode.utils'
import DelegationRootNode from './DelegationRootNode'
import { query as queryRoot } from './DelegationRootNode.chain'

const log = ConfigService.LoggingFactory.getLogger('DelegationNode')

export default class DelegationNode extends DelegationBaseNode
  implements IDelegationNode {
  /**
   * [STATIC] Queries the delegation node with [delegationId].
   *
   * @param delegationId The unique identifier of the desired delegation.
   * @returns Promise containing the [[DelegationNode]] or [null].
   */
  public static async query(
    delegationId: string
  ): Promise<DelegationNode | null> {
    log.info(`:: query('${delegationId}')`)
    const result = await query(delegationId)
    log.info(`result: ${JSON.stringify(result)}`)
    return result
  }

  public rootId: IDelegationNode['rootId']
  public parentId?: IDelegationNode['parentId']
  public permissions: IDelegationNode['permissions']

  /**
   * Creates a new [DelegationNode].
   *
   * @param delegationNodeInput - The base object from which to create the delegation node.
   */
  public constructor(delegationNodeInput: IDelegationNode) {
    super(delegationNodeInput)
    this.permissions = delegationNodeInput.permissions
    this.rootId = delegationNodeInput.rootId
    this.parentId = delegationNodeInput.parentId
    DelegationNodeUtils.errorCheck(this)
  }

  /**
   *
   * Generates the delegation hash from the delegations' property values.
   *
   * This hash is signed by the delegate and later stored along with the delegation to
   * make sure delegation data (such as permissions) is not tampered.
   *
   * @example
   * ```
   * // Sign the hash of the delegation node...
   * const delegate: Identity = ...
   * const signature:string = delegate.signStr(newDelegationNode.generateHash())
   *
   * // Store the signed hash on the Kilt chain...
   * const myIdentity: Identity = ...
   * tx = newDelegationNode.store(signature)
   * BlockchainUtils.signAndSendTx(tx, myIdentity)
   * ```
   *
   * @returns The hash representation of this delegation **as a hex string**.
   */
  public generateHash(): string {
    const propsToHash: Array<Uint8Array | string> = [this.id, this.rootId]
    if (this.parentId && this.parentId !== this.rootId) {
      propsToHash.push(this.parentId)
    }
    const uint8Props: Uint8Array[] = propsToHash.map((value) => {
      return Crypto.coToUInt8(value)
    })
    uint8Props.push(DelegationNodeUtils.permissionsAsBitset(this))
    const generated: string = Crypto.u8aToHex(
      Crypto.hash(Crypto.u8aConcat(...uint8Props), 256)
    )
    log.debug(`generateHash(): ${generated}`)
    return generated
  }

  /**
   * [ASYNC] Fetches the root of this delegation node.
   *
   * @throws [[ERROR_ROOT_NODE_QUERY]] when the rootId could not be queried.
   * @returns Promise containing the [[DelegationRootNode]] of this delegation node.
   */
  public async getRoot(): Promise<DelegationRootNode> {
    const rootNode = await queryRoot(this.rootId)
    if (!rootNode) {
      throw SDKErrors.ERROR_ROOT_NODE_QUERY(this.rootId)
    }
    return rootNode
  }

  /**
   * [ASYNC] Fetches the parent node of this delegation node.
   *
   * @returns Promise containing the parent as [[DelegationBaseNode]] or [null].
   */

  public async getParent(): Promise<DelegationBaseNode | null> {
    if (!this.parentId || this.parentId === this.rootId) {
      // parent must be root
      return this.getRoot()
    }
    return query(this.parentId)
  }

  /**
   * [ASYNC] Stores the delegation node on chain.
   *
   * @param signature Signature of the delegate to ensure it is done under the delegate's permission.
   * @returns Promise containing a unsigned SubmittableExtrinsic.
   */
  public async store(signature: string): Promise<SubmittableExtrinsic> {
    log.info(`:: store(${this.id})`)
    return store(this, signature)
  }

  /**
   * [ASYNC] Verifies the delegation node by querying it from chain and checking its revocation status.
   *
   * @returns Promise containing a boolean flag.
   */
  public async verify(): Promise<boolean> {
    const node = await query(this.id)
    return node !== null && !node.revoked
  }

  /**
   * [ASYNC] Revokes the delegation node on chain.
   *
   * @param address The address of the identity used to revoke the delegation.
   * @returns Promise containing an unsigned SubmittableExtrinsic.
   */
  public async revoke(address: string): Promise<SubmittableExtrinsic> {
    const { steps, node } = await this.findAncestorOwnedBy(address)
    if (!node) {
      throw SDKErrors.ERROR_UNAUTHORIZED(
        `Identity with address ${address} is not among the delegators and may not revoke this node`
      )
    }
    const childCount = await this.subtreeNodeCount()
    // must revoke all children and self
    const revocationCount = childCount + 1
    log.debug(
      `:: revoke(${this.id}) with maxRevocations=${revocationCount} and maxDepth = ${steps} through delegation node ${node?.id} and identity ${address}`
    )
    return revoke(this.id, steps, revocationCount)
  }

  public async getChildren(): Promise<DelegationNode[]> {
    return getChildren(this.id)
  }
}
