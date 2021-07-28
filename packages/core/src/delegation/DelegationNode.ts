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
 * A delegation object is stored on-chain, and can be revoked. A base node is created, a ID which may be used in a [[RequestForAttestation]].
 *
 * A delegation can and may restrict permissions.
 *
 * Permissions:
 *   * Delegate.
 *   * Attest.
 *
 * @packageDocumentation
 * @module DelegationNode
 * @preferred
 */

import type {
  IDelegationNode,
  IPublicIdentity,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import { query as queryAttestation } from '../attestation/Attestation.chain'
import {
  getChildren,
  getAttestationHashes,
  query,
  revoke,
  store,
} from './DelegationNode.chain'
import { query as queryDetails } from './DelegationHierarchyDetails.chain'
import * as DelegationNodeUtils from './DelegationNode.utils'
import DelegationHierarchyDetails from './DelegationHierarchyDetails'
import Attestation from '../attestation/Attestation'
import Identity from '../identity/Identity'

const log = ConfigService.LoggingFactory.getLogger('DelegationNode')

export default class DelegationNode implements IDelegationNode {
  public id: IDelegationNode['id']
  public hierarchyId: IDelegationNode['hierarchyId']
  public parentId?: IDelegationNode['parentId']
  public childrenIds: Array<IDelegationNode['id']> = []
  public account: IPublicIdentity['address']
  public permissions: IDelegationNode['permissions']
  public revoked: boolean

  /**
   * Creates a new [DelegationNode].
   *
   * @param delegationNodeInput - The base object from which to create the delegation node.
   */
  public constructor(delegationNodeInput: IDelegationNode) {
    this.id = delegationNodeInput.id
    this.hierarchyId = delegationNodeInput.hierarchyId
    this.parentId = delegationNodeInput.parentId
    this.childrenIds = delegationNodeInput.childrenIds
    this.account = delegationNodeInput.account
    this.permissions = delegationNodeInput.permissions
    this.revoked = delegationNodeInput.revoked
    DelegationNodeUtils.errorCheck(this)
  }

  /**
   * [ASYNC] Fetches the details of the hierarchy this delegation node belongs to.
   *
   * @throws [[ERROR_HIERARCHY_QUERY]] when the hierarchy details could not be queried.
   * @returns Promise containing the [[DelegationHierarchyDetails]] of this delegation node.
   */
  public async getHierarchyDetails(): Promise<DelegationHierarchyDetails> {
    const hierarchyDetails = await queryDetails(this.hierarchyId)
    if (!hierarchyDetails) {
      throw SDKErrors.ERROR_HIERARCHY_QUERY(this.hierarchyId)
    }
    return hierarchyDetails
  }

  /**
   * [ASYNC] Fetches the parent node of this delegation node.
   *
   * @returns Promise containing the parent as [[DelegationNode]] or [null].
   */
  public async getParent(): Promise<DelegationNode | null> {
    return this.parentId ? query(this.parentId) : Promise.resolve(null)
  }

  /**
   * [ASYNC] Fetches the children nodes of this delegation node.
   *
   * @returns Promise containing the children as an array of [[DelegationNode]], which is empty if there are no children.
   */
  public async getChildren(): Promise<DelegationNode[]> {
    return getChildren(this)
  }

  /**
   * [ASYNC] Fetches and resolves all attestations attested with this delegation node.
   *
   * @returns Promise containing all resolved attestations attested with this node.
   */
  public async getAttestations(): Promise<Attestation[]> {
    const attestationHashes = await this.getAttestationHashes()
    const attestations = await Promise.all(
      attestationHashes.map((claimHash: string) => {
        return queryAttestation(claimHash)
      })
    )

    return attestations.filter((value): value is Attestation => !!value)
  }

  /**
   * [ASYNC] Fetches all hashes of attestations attested with this delegation node.
   *
   * @returns Promise containing all attestation hashes attested with this node.
   */
  public async getAttestationHashes(): Promise<string[]> {
    return getAttestationHashes(this.id)
  }

  /**
   * [STATIC] [ASYNC] Queries the delegation node with its [delegationId].
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
    const propsToHash: Array<Uint8Array | string> = [this.id, this.hierarchyId]
    if (this.parentId) {
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
   * Checks on chain whether a identity with the given address is delegating to the current node.
   *
   * @param address The address of the identity.
   * @returns An object containing a `node` owned by the identity if it is delegating, plus the number of `steps` traversed. `steps` is 0 if the address is owner of the current node.
   */
  public async findAncestorOwnedBy(
    address: Identity['address']
  ): Promise<{ steps: number; node: DelegationNode | null }> {
    if (this.account === address) {
      return {
        steps: 0,
        node: this,
      }
    }
    const parent = await this.getParent()
    if (parent) {
      const result = await parent.findAncestorOwnedBy(address)
      result.steps += 1
      return result
    }
    return {
      steps: 0,
      node: null,
    }
  }

  /**
   * [ASYNC] Recursively counts all nodes that descend from the current node (excluding the current node).
   *
   * @returns Promise resolving to the node count.
   */
  public async subtreeNodeCount(): Promise<number> {
    const children = await this.getChildren()
    if (children.length === 0) {
      return 0
    }
    const childrensChildCounts = await Promise.all(
      children.map((child) => child.subtreeNodeCount())
    )
    return (
      children.length +
      childrensChildCounts.reduce((previous, current) => previous + current)
    )
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
    const childrenCount = await this.subtreeNodeCount()
    log.debug(
      `:: revoke(${this.id}) with maxRevocations=${childrenCount} and maxDepth = ${steps} through delegation node ${node?.id} and identity ${address}`
    )
    return revoke(this.id, steps, childrenCount)
  }
}
