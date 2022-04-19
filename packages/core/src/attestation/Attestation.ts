/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * An [[Attestation]] certifies a [[Claim]], sent by a claimer in the form of a [[RequestForAttestation]]. [[Attestation]]s are **written on the blockchain** and are **revocable**.
 * Note: once an [[Attestation]] is stored, it can be sent to and stored with the claimer as a [[Credential]].
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
  IDidDetails,
} from '@kiltprotocol/types'
import { BN } from '@polkadot/util'
import {
  getRevokeTx,
  query,
  getStoreTx,
  getRemoveTx,
  getReclaimDepositTx,
  queryDepositAmount,
} from './Attestation.chain.js'
import * as AttestationUtils from './Attestation.utils.js'
import { DelegationNode } from '../delegation/DelegationNode.js'

export class Attestation implements IAttestation {
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
  public static async query(
    claimHash: IAttestation['claimHash']
  ): Promise<Attestation | null> {
    return query(claimHash)
  }

  /**
   * [STATIC] [ASYNC] Revokes an attestation. Also available as an instance method.
   *
   * @param claimHash - The hash of the claim that corresponds to the attestation to revoke.
   * @param maxDepth - The number of levels to walk up the delegation hierarchy until the delegation node is found.
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   * @example ```javascript
   * Attestation.getRevokeTx('0xd8024cdc147c4fa9221cd177', 3).then(
   *   (revocationExtrinsic) => {
   *     // The attestation revocation tx was created, and it can now be signed by the attestation owner.
   *     attestationOwnerDid
   *       .authorizeExtrinsic(revocationExtrinsic, keystore, submitter.address)
   *       .then((authorizedExtrinsic) => {
   *         // The DID-authorized tx is ready to be submitted!
   *         BlockchainUtils.signAndSendTx(authorizedExtrinsic, submitter);
   *       });
   *   }
   * );
   * ```
   */
  public static async getRevokeTx(
    claimHash: IRequestForAttestation['rootHash'],
    maxDepth: number
  ): Promise<SubmittableExtrinsic> {
    return getRevokeTx(claimHash, maxDepth)
  }

  /**
   * [STATIC] [ASYNC] Removes an attestation. Also available as an instance method.
   *
   * @param claimHash - The hash of the claim that corresponds to the attestation to remove.
   * @param maxDepth - The number of levels to walk up the delegation hierarchy until the delegation node is found.
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   * @example ```javascript
   * Attestation.getRemoveTx('0xd8024cdc147c4fa9221cd177', 3).then(
   *   (removalExtrinsic) => {
   *     // The attestation removal tx was created, and it can now be signed by the attestation owner.
   *     attestationOwnerDid
   *       .authorizeExtrinsic(removalExtrinsic, keystore, submitter.address)
   *       .then((authorizedExtrinsic) => {
   *         // The DID-authorized tx is ready to be submitted!
   *         BlockchainUtils.signAndSendTx(authorizedExtrinsic, submitter);
   *       });
   *   }
   * );
   * ```
   */
  public static async getRemoveTx(
    claimHash: IRequestForAttestation['rootHash'],
    maxDepth: number
  ): Promise<SubmittableExtrinsic> {
    return getRemoveTx(claimHash, maxDepth)
  }

  /**
   * [STATIC] [ASYNC] Reclaims the deposit of an attestation and removes the attestation. Also available as an instance method.
   *
   * This call can only be successfully executed if the submitter of the transaction is the original payer of the attestation deposit.
   *
   * @param claimHash - The hash of the claim that corresponds to the attestation to remove and its deposit to be returned to the original payer.
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   * @example ```javascript
   * Attestation.getReclaimDepositTx('0xd8024cdc147c4fa9221cd177').then(
   *   (claimExtrinsic) => {
   *     // The deposit claiming tx was created, and it can now be submitted by the attestation deposit payer ONLY.
   *     BlockchainUtils.signAndSendTx(claimExtrinsic, submitter);
   *   }
   * );
   * ```
   */
  public static async getReclaimDepositTx(
    claimHash: IRequestForAttestation['rootHash']
  ): Promise<SubmittableExtrinsic> {
    return getReclaimDepositTx(claimHash)
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
   * @param attesterDid - The attester's DID, used to attest to the underlying claim.
   * @returns A new [[Attestation]] object.
   * @example ```javascript
   * // create a complete new attestation from the `RequestForAttestation` and all other needed properties
   * Attestation.fromRequestAndDid(request, attesterDid);
   * ```
   */
  public static fromRequestAndDid(
    request: IRequestForAttestation,
    attesterDid: IDidDetails['uri']
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
   * // Use `store` to store an attestation on chain, and to create a `Credential` upon success:
   * attestation.getStoreTx().then((creationExtrinsic) => {
   *   // the attestation store tx was successfully prepared, so now we can sign and send it and subsequently create a `Credential`.
   *   attestationOwnerDid
   *     .authorizeExtrinsic(creationExtrinsic, keystore, submitter.address)
   *     .then((authorizedExtrinsic) => {
   *       // The DID-authorized tx is ready to be submitted!
   *       BlockchainUtils.signAndSendTx(authorizedExtrinsic, submitter);
   *     });
   * });
   * // The attestation creation tx was created, and it can now be signed by a DID owner.
   * const authorizedExtrinsic = await attestationOwnerDid.authorizeExtrinsic(
   *   creationExtrinsic,
   *   keystore,
   *   submitter.address
   * );
   * // The DID-authorized tx is ready to be submitted!
   * BlockchainUtils.signAndSendTx(authorizedExtrinsic, submitter);
   * ```
   */
  public async getStoreTx(): Promise<SubmittableExtrinsic> {
    return getStoreTx(this)
  }

  /**
   * [ASYNC] Prepares an extrinsic to revoke the attestation. Also available as a static method.
   *
   * @param maxDepth - The number of levels to walk up the delegation hierarchy until the delegation node is found.
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   * @example ```javascript
   * attestation.getRevokeTx(3).then((revocationExtrinsic) => {
   *   // The attestation revocation tx was created, and it can now be signed by the attestation owner.
   *   attestationOwnerDid
   *     .authorizeExtrinsic(revocationExtrinsic, keystore, submitter.address)
   *     .then((authorizedExtrinsic) => {
   *       // The DID-authorized tx is ready to be submitted!
   *       BlockchainUtils.signAndSendTx(authorizedExtrinsic, submitter);
   *     });
   * });
   * ```
   */
  public async getRevokeTx(maxDepth: number): Promise<SubmittableExtrinsic> {
    return getRevokeTx(this.claimHash, maxDepth)
  }

  /**
   * [ASYNC] Prepares an extrinsic to remove the attestation. Also available as a static method.
   *
   * @param maxDepth - The number of levels to walk up the delegation hierarchy until the delegation node is found.
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   * @example ```javascript
   * attestation.getRemoveTx(3).then((removalExtrinsic) => {
   *   // The attestation removal tx was created, and it can now be signed by the attestation owner.
   *   attestationOwnerDid
   *     .authorizeExtrinsic(removalExtrinsic, keystore, submitter.address)
   *     .then((authorizedExtrinsic) => {
   *       // The DID-authorized tx is ready to be submitted!
   *       BlockchainUtils.signAndSendTx(authorizedExtrinsic, submitter);
   *     });
   * });
   * ```
   */
  public async getRemoveTx(maxDepth: number): Promise<SubmittableExtrinsic> {
    return getRemoveTx(this.claimHash, maxDepth)
  }

  /**
   * [STATIC] [ASYNC] Reclaims the deposit of an attestation and removes the attestation. Also available as an instance method.
   *
   * This call can only be successfully executed if the submitter of the transaction is the original payer of the attestation deposit.
   *
   * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
   * @example ```javascript
   * attestation.getReclaimDepositTx().then((claimExtrinsic) => {
   *   // The deposit claiming tx was created, and it can now be submitted by the attestation deposit payer ONLY.
   *   BlockchainUtils.signAndSendTx(claimExtrinsic, submitter);
   * });
   * ```
   */
  public async getReclaimDepositTx(): Promise<SubmittableExtrinsic> {
    return getReclaimDepositTx(this.claimHash)
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
    claimHash: IAttestation['claimHash'] = attestation.claimHash
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
