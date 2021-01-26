/**
 * Delegations are the building blocks of top-down trust structures in KILT. An Attester can inherit trust through delegation from another attester ("top-down").
 * In order to model these trust hierarchies, a delegation is represented as a **node** in a **delegation tree**.
 *
 * A delegation object is stored on-chain, and can be revoked. A base node is created, a ID which may be used in a [[RequestForAttestation]].
 * A delegation can and may restrict permissions.
 *
 * Permissions:
 *   * Delegate.
 *   * Attest.
 *
 * @packageDocumentation
 * @module DelegationBaseNode
 * @preferred
 */

import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { IDelegationBaseNode } from '@kiltprotocol/types'
import Attestation from '../attestation/Attestation'
import { query } from '../attestation/Attestation.chain'
import Identity from '../identity/Identity'
import { getAttestationHashes } from './Delegation.chain'
import DelegationNode from './DelegationNode'
import DelegationRootNode from './DelegationRootNode'

export default abstract class DelegationBaseNode
  implements IDelegationBaseNode {
  public id: IDelegationBaseNode['id']
  public account: IDelegationBaseNode['account']
  public revoked: IDelegationBaseNode['revoked'] = false

  /**
   * Builds a new [DelegationBaseNode] instance.
   *
   * @param id The unique identifier of the delegation node.
   * @param account The owner address of the delegation node.
   */
  public constructor(
    id: IDelegationBaseNode['id'],
    account: IDelegationBaseNode['account']
  ) {
    this.account = account
    this.id = id
  }

  /**
   * Fetches the root of the delegation tree.
   *
   * @returns Promise containing [[DelegationRootNode]].
   */
  public abstract getRoot(): Promise<DelegationRootNode>

  /**
   * Fetches the parent delegation node. If the parent node is [null] this node is a direct child of the root node.
   *
   * @returns Promise containing the parent node or [null].
   */
  public abstract getParent(): Promise<DelegationBaseNode | null>

  /**
   * Fetches the children nodes of the current node.
   *
   * @returns Promise containing the resolved children nodes.
   */
  public abstract getChildren(): Promise<DelegationNode[]>

  /**
   * Fetches and resolves all attestations attested with this delegation node.
   *
   * @returns Promise containing all resolved attestations attested with this node.
   */
  public async getAttestations(): Promise<Attestation[]> {
    const attestationHashes = await this.getAttestationHashes()
    const attestations = await Promise.all(
      attestationHashes.map((claimHash: string) => {
        return query(claimHash)
      })
    )

    return attestations.filter((value): value is Attestation => !!value)
  }

  /**
   * Fetches all hashes of attestations attested with this delegation node.
   *
   * @returns Promise containing all attestation hashes attested with this node.
   */
  public async getAttestationHashes(): Promise<string[]> {
    return getAttestationHashes(this.id)
  }

  /**
   * Verifies this delegation node by querying it from chain and checking its [revoked] status.
   *
   * @returns Promise containing a boolean flag indicating if the verification succeeded.
   */
  public abstract verify(): Promise<boolean>

  /**
   * Revokes this delegation node on chain.
   *
   * @returns Promise containing a submittable transaction.
   */
  public abstract revoke(identity: Identity): Promise<SubmittableExtrinsic>
}
