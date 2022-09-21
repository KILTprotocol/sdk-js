/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidDocument,
  DidUri,
  DidVerificationKey,
  IAttestation,
  ICType,
  IDelegationHierarchyDetails,
  IDelegationNode,
  SignCallback,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors, UUID } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import * as Did from '@kiltprotocol/did'
import type { HexString } from '@polkadot/util/types'
import type { DelegationHierarchyDetailsRecord } from './DelegationDecoder'
import { fromChain as attestationFromChain } from '../attestation/Attestation.chain.js'
import {
  addDelegationToChainArgs,
  getAttestationHashes,
  getChildren,
  query,
} from './DelegationNode.chain.js'
import { query as queryDetails } from './DelegationHierarchyDetails.chain.js'
import * as DelegationNodeUtils from './DelegationNode.utils.js'

const log = ConfigService.LoggingFactory.getLogger('DelegationNode')

type NewDelegationNodeInput = Required<
  Pick<IDelegationNode, 'hierarchyId' | 'parentId' | 'account' | 'permissions'>
>

type NewDelegationRootInput = Pick<IDelegationNode, 'account' | 'permissions'> &
  DelegationHierarchyDetailsRecord

/**
 * Delegation nodes are used within the KILT protocol to construct the trust hierarchy.
 *
 * Starting from the root node, entities can delegate the right to issue attestations to Claimers for a certain CTYPE and also delegate the right to attest and to delegate further nodes.
 *
 * A delegation object is stored on-chain, and can be revoked.
 *
 * A delegation can and may restrict permissions.
 *
 * Permissions:
 *   * Delegate.
 *   * Attest.
 */
export class DelegationNode implements IDelegationNode {
  public readonly id: IDelegationNode['id']
  public readonly hierarchyId: IDelegationNode['hierarchyId']
  public readonly parentId?: IDelegationNode['parentId']
  private childrenIdentifiers: Array<IDelegationNode['id']> = []
  public readonly account: DidUri
  public readonly permissions: IDelegationNode['permissions']
  private hierarchyDetails?: IDelegationHierarchyDetails
  public readonly revoked: boolean

  // eslint-disable-next-line jsdoc/require-param
  /**
   * Creates a new [DelegationNode] from an [IDelegationNode].
   *
   */
  public constructor({
    id,
    hierarchyId,
    parentId,
    childrenIds,
    account,
    permissions,
    revoked,
  }: IDelegationNode) {
    this.id = id
    this.hierarchyId = hierarchyId
    this.parentId = parentId
    this.childrenIdentifiers = childrenIds
    this.account = account
    this.permissions = permissions
    this.revoked = revoked
    DelegationNodeUtils.errorCheck(this)
  }

  public get childrenIds(): Array<IDelegationNode['id']> {
    return this.childrenIdentifiers
  }

  /**
   * Builds a new [DelegationNode] representing a regular delegation node ready to be submitted to the chain for creation.
   *
   * @param input - An partial [IDelegationNode] input object.
   * @param input.hierarchyId - The delegation hierarchy under which to store the node.
   * @param input.parentId - The parent node under which to store the node.
   * @param input.account - The owner (i.e., delegate) of this delegation.
   * @param input.permissions - The set of permissions associated with this delegation node.
   * @returns A new [DelegationNode] with a randomly generated id.
   */
  public static newNode({
    hierarchyId,
    parentId, // Cannot be undefined here
    account,
    permissions,
  }: NewDelegationNodeInput): DelegationNode {
    return new DelegationNode({
      id: UUID.generate(),
      hierarchyId,
      parentId,
      account,
      permissions,
      childrenIds: [],
      revoked: false,
    })
  }

  /**
   * Builds a new [DelegationNode] representing a root delegation node ready to be submitted to the chain for creation.
   *
   * @param input - An input object.
   * @param input.account - The address of this delegation (and of the whole hierarchy under it).
   * @param input.permissions - The set of permissions associated with this delegation node.
   * @param input.cTypeHash - The cTypeHash associated with the entire hierarchy.
   * @returns A new [DelegationNode] with a randomly generated id.
   */
  public static newRoot({
    account,
    permissions,
    cTypeHash,
  }: NewDelegationRootInput): DelegationNode {
    const nodeId = UUID.generate()

    const newNode = new DelegationNode({
      id: nodeId,
      hierarchyId: nodeId,
      account,
      permissions,
      childrenIds: [],
      revoked: false,
    })
    newNode.hierarchyDetails = {
      id: nodeId,
      cTypeHash,
    }

    return newNode
  }

  /**
   * Lazily fetches the details of the hierarchy the node is part of and return its CType.
   *
   * @returns The CType hash associated with the delegation hierarchy.
   */
  public async getCTypeHash(): Promise<ICType['hash']> {
    const { cTypeHash } = await this.getHierarchyDetails()
    return cTypeHash
  }

  /**
   * Fetches the details of the hierarchy this delegation node belongs to.
   *
   * @returns Promise containing the [[IDelegationHierarchyDetails]] of this delegation node.
   */
  public async getHierarchyDetails(): Promise<IDelegationHierarchyDetails> {
    if (!this.hierarchyDetails) {
      const hierarchyDetails = await queryDetails(this.hierarchyId)
      if (!hierarchyDetails) {
        throw new SDKErrors.HierarchyQueryError(this.hierarchyId)
      }
      this.hierarchyDetails = hierarchyDetails
      return hierarchyDetails
    }
    return this.hierarchyDetails
  }

  /**
   * Fetches the parent node of this delegation node.
   *
   * @returns Promise containing the parent as [[DelegationNode]] or [null].
   */
  public async getParent(): Promise<DelegationNode | null> {
    return this.parentId ? query(this.parentId) : null
  }

  /**
   * Fetches the children nodes of this delegation node.
   *
   * @returns Promise containing the children as an array of [[DelegationNode]], which is empty if there are no children.
   */
  public async getChildren(): Promise<DelegationNode[]> {
    const refreshedNodeDetails = await query(this.id)
    // Updates the children info with the latest information available on chain.
    if (refreshedNodeDetails) {
      this.childrenIdentifiers = refreshedNodeDetails.childrenIds
    }
    return getChildren(this)
  }

  /**
   * Fetches and resolves all attestations attested with this delegation node.
   *
   * @returns Promise containing all resolved attestations attested with this node.
   */
  public async getAttestations(): Promise<IAttestation[]> {
    const attestationHashes = await this.getAttestationHashes()
    const api = ConfigService.get('api')

    const attestations = await Promise.all(
      attestationHashes.map(async (claimHash) => {
        const encoded = await api.query.attestation.attestations(claimHash)
        if (encoded.isNone) return undefined
        return attestationFromChain(encoded, claimHash)
      })
    )

    return attestations.filter((value): value is IAttestation => !!value)
  }

  /**
   * Fetches all hashes of attestations attested with this delegation node.
   *
   * @returns Promise containing all attestation hashes attested with this node.
   */
  public async getAttestationHashes(): Promise<
    Array<IAttestation['claimHash']>
  > {
    return getAttestationHashes(this.id)
  }

  /**
   *
   * Generates the delegation hash from the delegations' property values.
   *
   * This hash is signed by the delegate and later stored along with the delegation to
   * make sure delegation data (such as permissions) has not been tampered with.
   *
   * @returns The hash representation of this delegation **as a hex string**.
   */
  public generateHash(): HexString {
    const propsToHash = [this.id, this.hierarchyId]
    if (this.parentId) {
      propsToHash.push(this.parentId)
    }
    const uint8Props = propsToHash.map((value) => Crypto.coToUInt8(value))
    uint8Props.push(DelegationNodeUtils.permissionsAsBitset(this))
    const generated = Crypto.u8aToHex(
      Crypto.hash(Crypto.u8aConcat(...uint8Props), 256)
    )
    log.debug(`generateHash(): ${generated}`)
    return generated
  }

  /**
   * Signs the delegation hash from the delegations' property values.
   *
   * This is required to anchor the delegation node on chain in order to enforce the delegate's consent.
   *
   * @param delegateDid The DID of the delegate.
   * @param sign The callback to sign the delegation creation details for the delegate.
   * @returns The DID signature over the delegation **as a hex string**.
   */
  public async delegateSign(
    delegateDid: DidDocument,
    sign: SignCallback
  ): Promise<Did.Utils.EncodedSignature> {
    const delegateSignature = await Did.signPayload(
      delegateDid.uri,
      this.generateHash(),
      sign
    )
    const { fragment } = Did.Utils.parseDidUri(delegateSignature.keyUri)
    if (!fragment) {
      throw new SDKErrors.DidError(
        `DID key uri "${delegateSignature.keyUri}" couldn't be parsed`
      )
    }
    const key = Did.getKey(delegateDid, fragment)
    if (!key) {
      throw new SDKErrors.DidError(
        `Key with fragment "${fragment}" was not found on DID: "${delegateDid.uri}"`
      )
    }
    return Did.Chain.didSignatureToChain(
      key as DidVerificationKey,
      delegateSignature
    )
  }

  /**
   * Synchronise the delegation node state with the latest state as stored on the blockchain.
   *
   * @returns An updated instance of the same [DelegationNode] containing the up-to-date state fetched from the chain.
   */
  public async getLatestState(): Promise<DelegationNode> {
    const newNodeState = await query(this.id)
    if (!newNodeState) {
      throw new SDKErrors.DelegationIdMissingError()
    }
    return newNodeState
  }

  /**
   * Stores the delegation node on chain.
   *
   * @param signature Signature of the delegate to ensure it is done under the delegate's permission.
   * @returns Promise containing an unsigned SubmittableExtrinsic.
   */
  public async getStoreTx(
    signature?: Did.Utils.EncodedSignature
  ): Promise<SubmittableExtrinsic> {
    const api = ConfigService.get('api')

    if (this.isRoot()) {
      return api.tx.delegation.createHierarchy(
        this.hierarchyId,
        await this.getCTypeHash()
      )
    }
    if (!signature) {
      throw new SDKErrors.DelegateSignatureMissingError()
    }

    return api.tx.delegation.addDelegation(
      ...addDelegationToChainArgs(this, signature)
    )
  }

  isRoot(): boolean {
    return this.id === this.hierarchyId && !this.parentId
  }

  /**
   * Verifies the delegation node by querying it from chain and checking its revocation status.
   */
  public async verify(): Promise<void> {
    const node = await query(this.id)
    if (!node || node.revoked !== false) {
      throw new SDKErrors.InvalidDelegationNodeError(
        'Delegation node not found or revoked'
      )
    }
  }

  /**
   * Checks on chain whether an identity with the given DID is delegating to the current node.
   *
   * @param did The DID to search for.
   *
   * @returns An object containing a `node` owned by the identity if it is delegating, plus the number of `steps` traversed. `steps` is 0 if the DID is owner of the current node.
   */
  public async findAncestorOwnedBy(
    did: DidUri
  ): Promise<{ steps: number; node: DelegationNode | null }> {
    if (this.account === did) {
      return {
        steps: 0,
        node: this,
      }
    }
    const parent = await this.getParent()
    if (parent) {
      const result = await parent.findAncestorOwnedBy(did)
      result.steps += 1
      return result
    }
    return {
      steps: 0,
      node: null,
    }
  }

  /**
   * Recursively counts all nodes that descend from the current node (excluding the current node). It is important to first refresh the state of the node from the chain.
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
   * Revokes the delegation node on chain.
   *
   * @param did The address of the identity used to revoke the delegation.
   * @returns Promise containing an unsigned SubmittableExtrinsic.
   */
  public async getRevokeTx(did: DidUri): Promise<SubmittableExtrinsic> {
    const { steps, node } = await this.findAncestorOwnedBy(did)
    if (!node) {
      throw new SDKErrors.UnauthorizedError(
        `The DID "${did}" is not among the delegators and may not revoke this node`
      )
    }
    const childCount = await this.subtreeNodeCount()
    log.debug(
      `:: revoke(${this.id}) with maxRevocations=${childCount} and maxDepth = ${steps} through delegation node ${node?.id} and identity ${did}`
    )
    const api = ConfigService.get('api')
    return api.tx.delegation.revokeDelegation(this.id, steps, childCount)
  }

  /**
   * Removes the delegation node from the chain.
   *
   * @returns Promise containing an unsigned SubmittableExtrinsic.
   */
  public async getRemoveTx(): Promise<SubmittableExtrinsic> {
    const childCount = await this.subtreeNodeCount()
    log.debug(`:: remove(${this.id}) with maxRevocations=${childCount}`)
    const api = ConfigService.get('api')
    return api.tx.delegation.removeDelegation(this.id, childCount)
  }

  /**
   * Reclaims the deposit of a delegation and removes the delegation and all its children.
   *
   * This call can only be successfully executed if the submitter of the transaction is the original payer of the delegation deposit.
   *
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   */
  public async getReclaimDepositTx(): Promise<SubmittableExtrinsic> {
    const childCount = await this.subtreeNodeCount()
    log.debug(
      `:: getReclaimDepositTx(${this.id}) with maxRemovals=${childCount}`
    )
    const api = ConfigService.get('api')
    return api.tx.delegation.reclaimDeposit(this.id, childCount)
  }

  /**
   * Queries the delegation node with its [delegationId].
   *
   * @param delegationId The unique identifier of the desired delegation.
   * @returns Promise containing the [[DelegationNode]] or [null].
   */
  public static async query(
    delegationId: IDelegationNode['id']
  ): Promise<DelegationNode | null> {
    log.info(`:: query('${delegationId}')`)
    const result = await query(delegationId)
    log.info(`result: ${JSON.stringify(result)}`)
    return result
  }
}
