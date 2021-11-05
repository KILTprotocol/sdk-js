/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * An [[Attestation]] certifies a [[Claim]], sent by a claimer in the form of a [[RequestForAttestation]]. [[Attestation]]s are **written on the blockchain** and are **revocable**.
 * Note: once an [[Attestation]] is stored, it can be sent to and stored with the claimer as an [[Credential]].
 *
 * An [[Attestation]] can be queried from the chain. It's stored on-chain in a map:
 * * the key is the hash of the corresponding claim;
 * * the value is a tuple ([[CType]] hash, account, id of the Delegation, and revoked flag).
 *
 * @packageDocumentation
 * @module Attestation
 * @preferred
 */

import type { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import type {
  IAttestation,
  IDelegationHierarchyDetails,
  IRequestForAttestation,
  CompressedAttestation,
} from '@kiltprotocol/types'
import { BN } from '@polkadot/util'
import {
  revoke,
  query,
  store,
  remove,
  reclaimDeposit,
  queryDepositAmount,
} from './Attestation.chain'
import AttestationUtils from './Attestation.utils'
import DelegationNode from '../delegation/DelegationNode'

export default class Attestation implements IAttestation {
  /**
   * [STATIC] [ASYNC] Queries the chain for a given attestation, by `claimHash`.
   *
   * @param claimHash - The hash of the claim that corresponds to the attestation to query.
   * @returns A promise containing the [[Attestation]] or null.
   * @example ```javascript
   * Attestation.query('0xd8024cdc147c4fa9221cd177').then((attestation) => {
   *   // now we can for example revoke `attestation`
   * });
   * ```
   */
  public static async query(claimHash: string): Promise<Attestation | null> {
    return query(claimHash)
  }

  /**
   * [STATIC] [ASYNC] Revokes an attestation. Also available as an instance method.
   *
   * @param claimHash - The hash of the claim that corresponds to the attestation to revoke.
   * @param maxDepth - The number of levels to walk up the delegation hierarchy until the delegation node is found.
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   * @example ```javascript
   * Attestation.revoke('0xd8024cdc147c4fa9221cd177', 3).then(() => {
   *   // the attestation revocation tx was created, sign and send it!
   *   BlockchainUtils.signAndSendTx(tx, identity);
   * });
   * ```
   */
  public static async revoke(
    claimHash: string,
    maxDepth: number
  ): Promise<SubmittableExtrinsic> {
    return revoke(claimHash, maxDepth)
  }

  /**
   * [STATIC] [ASYNC] Removes an attestation. Also available as an instance method.
   *
   * @param claimHash - The hash of the claim that corresponds to the attestation to remove.
   * @param maxDepth - The number of levels to walk up the delegation hierarchy until the delegation node is found.
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   */
  public static async remove(
    claimHash: string,
    maxDepth: number
  ): Promise<SubmittableExtrinsic> {
    return remove(claimHash, maxDepth)
  }

  /**
   * [STATIC] [ASYNC] Reclaims the deposit of an attestation and removes the attestation. Also available as an instance method.
   *
   * This call can only be successfully executed if the submitter of the transaction is the original payer of the attestation deposit.
   *
   * @param claimHash - The hash of the claim that corresponds to the attestation to remove and its deposit to be returned to the original payer.
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   */
  public static async reclaimDeposit(
    claimHash: string
  ): Promise<SubmittableExtrinsic> {
    return reclaimDeposit(claimHash)
  }

  /**
   * [STATIC] Builds an instance of [[Attestation]], from a simple object with the same properties.
   * Used for deserialization.
   *
   * @param attestationInput - The base object from which to create the attestation.
   * @returns A new [[Attestation]] object.
   * @example ```javascript
   * // create an Attestation object, so we can call methods on it (`serialized` is a serialized Attestation object )
   * Attestation.fromAttestation(JSON.parse(serialized));
   * ```
   */
  public static fromAttestation(attestationInput: IAttestation): Attestation {
    return new Attestation(attestationInput)
  }

  /**
   * [STATIC] Builds a new instance of an [[Attestation]], from a complete set of input required for an attestation.
   *
   * @param request - The base request for attestation.
   * @param attesterDid - The attester's did, used to attest to the underlying claim.
   * @returns A new [[Attestation]] object.
   * @example ```javascript
   * // create a complete new attestation from the `RequestForAttestation` and all other needed properties
   * Attestation.fromRequestAndDid(request, attesterDid);
   * ```
   */
  public static fromRequestAndDid(
    request: IRequestForAttestation,
    attesterDid: string
  ): Attestation {
    return new Attestation({
      claimHash: request.rootHash,
      cTypeHash: request.claim.cTypeHash,
      delegationId: request.delegationId,
      owner: attesterDid,
      revoked: false,
    })
  }

  /**
   * [STATIC] [ASYNC] Tries to query the delegationId and if successful query the rootId.
   *
   * @param delegationId - The Id of the Delegation stored in [[Attestation]].
   * @returns A promise of either null if querying was not successful or the affiliated [[DelegationNode]].
   */
  public static async getDelegationDetails(
    delegationId: IAttestation['delegationId'] | null
  ): Promise<IDelegationHierarchyDetails | null> {
    if (!delegationId) {
      return null
    }
    const delegationNode: DelegationNode | null = await DelegationNode.query(
      delegationId
    )
    if (!delegationNode) {
      return null
    }
    return delegationNode.getHierarchyDetails()
  }

  public async getDelegationDetails(): Promise<IDelegationHierarchyDetails | null> {
    return Attestation.getDelegationDetails(this.delegationId)
  }

  /**
   *  [STATIC] Custom Type Guard to determine input being of type IAttestation using the AttestationUtils errorCheck.
   *
   * @param input The potentially only partial IAttestation.
   * @returns Boolean whether input is of type IAttestation.
   */
  public static isIAttestation(input: unknown): input is IAttestation {
    try {
      AttestationUtils.errorCheck(input as IAttestation)
    } catch (error) {
      return false
    }
    return true
  }

  public claimHash: IAttestation['claimHash']
  public cTypeHash: IAttestation['cTypeHash']
  public delegationId: IAttestation['delegationId'] | null
  public owner: IAttestation['owner']
  public revoked: IAttestation['revoked']

  /**
   * Builds a new [[Attestation]] instance.
   *
   * @param attestationInput - The base object from which to create the attestation.
   * @example ```javascript
   * // create an attestation, e.g. to store it on-chain
   * const attestation = new Attestation(attestationInput);
   * ```
   */
  public constructor(attestationInput: IAttestation) {
    AttestationUtils.errorCheck(attestationInput)
    this.claimHash = attestationInput.claimHash
    this.cTypeHash = attestationInput.cTypeHash
    this.delegationId = attestationInput.delegationId
    this.owner = attestationInput.owner
    this.revoked = attestationInput.revoked
  }

  /**
   * [ASYNC] Prepares an extrinsic to store the attestation on chain.
   *
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   * @example ```javascript
   * // Use `store` to store an attestation on chain, and to create an `Credential` upon success:
   * attestation.store().then(() => {
   *   // the attestation store tx was successfully prepared, so now we can sign and send it and subsequently create an `Credential`.
   * });
   * ```
   */
  public async store(): Promise<SubmittableExtrinsic> {
    return store(this)
  }

  /**
   * [ASYNC] Prepares an extrinisc to revoke the attestation. Also available as a static method.
   *
   * @param maxDepth - The number of levels to walk up the delegation hierarchy until the delegation node is found.
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   * @example ```javascript
   * attestation.revoke(3).then((tx) => {
   *   // the attestation revocation tx was created, sign and send it!
   *   BlockchainUtils.signAndSendTx(tx, identity);
   * });
   * ```
   */
  public async revoke(maxDepth: number): Promise<SubmittableExtrinsic> {
    return revoke(this.claimHash, maxDepth)
  }

  /**
   * [ASYNC] Prepares an extrinsic to remove the attestation. Also available as a static method.
   *
   * @param maxDepth - The number of levels to walk up the delegation hierarchy until the delegation node is found.
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   */
  public async remove(maxDepth: number): Promise<SubmittableExtrinsic> {
    return remove(this.claimHash, maxDepth)
  }

  /**
   * [STATIC] [ASYNC] Reclaims the deposit of an attestation and removes the attestation. Also available as an instance method.
   *
   * This call can only be successfully executed if the submitter of the transaction is the original payer of the attestation deposit.
   *
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   */
  public async reclaimDeposit(): Promise<SubmittableExtrinsic> {
    return reclaimDeposit(this.claimHash)
  }

  /**
   * [STATIC] [ASYNC] Queries an attestation from the chain and checks its validity.
   *
   * @param attestation - The Attestation to verify.
   * @param claimHash - The hash of the claim that corresponds to the attestation to check. Defaults to the claimHash for the attestation onto which "verify" is called.
   * @returns A promise containing whether the attestation is valid.
   * @example ```javascript
   * Attestation.checkValidity(attestation).then((isVerified) => {
   *   // `isVerified` is true if the attestation is verified, false otherwise
   * });
   * ```
   */
  public static async checkValidity(
    attestation: IAttestation,
    claimHash: string = attestation.claimHash
  ): Promise<boolean> {
    // Query attestation by claimHash. null if no attestation is found on-chain for this hash
    const chainAttestation: Attestation | null = await Attestation.query(
      claimHash
    )
    return !!(
      chainAttestation !== null &&
      chainAttestation.owner === attestation.owner &&
      !chainAttestation.revoked
    )
  }

  public async checkValidity(): Promise<boolean> {
    return Attestation.checkValidity(this)
  }

  /**
   * Compresses an [[Attestation]] object.
   *
   * @returns An array that contains the same properties of an [[Attestation]].
   */
  public compress(): CompressedAttestation {
    return AttestationUtils.compress(this)
  }

  /**
   * [STATIC] Builds an [[Attestation]] from the compressed array.
   *
   * @param attestation The [[CompressedAttestation]] that should get decompressed.
   * @returns A new [[Attestation]] object.
   */
  public static decompress(attestation: CompressedAttestation): Attestation {
    const decompressedAttestation = AttestationUtils.decompress(attestation)
    return Attestation.fromAttestation(decompressedAttestation)
  }

  /**
   * [STATIC] Query and return the amount of KILTs (in femto notation) needed to deposit in order to create an attestation.
   *
   * @returns The amount of femtoKILTs required to deposit to create the attestation.
   */
  public static queryDepositAmount(): Promise<BN> {
    return queryDepositAmount()
  }
}
