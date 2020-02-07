/**
 * An [[Attestation]] certifies a [[Claim]], sent by a claimer in the form of a [[RequestForAttestation]]. [[Attestation]]s are **written on the blockchain** and are **revocable**.
 * Note: once an [[Attestation]] is stored, it can be sent to and stored with the claimer as an [[AttestedClaim]] ("Credential").
 *
 * An [[Attestation]] can be queried from the chain. It's stored on-chain in a map:
 * * the key is the hash of the corresponding claim;
 * * the value is a tuple ([[CType]] hash, account, id of the Delegation, and revoked flag).
 *
 * @packageDocumentation
 * @module Attestation
 * @preferred
 */

import { SubmittableResult } from '@polkadot/api'
import { validateHash, validateAddress } from '../util/DataUtils'
import IRequestForAttestation from '../types/RequestForAttestation'
import Identity from '../identity/Identity'
import IAttestation, { CompressedAttestation } from '../types/Attestation'
import { revoke, query, store } from './Attestation.chain'
import IPublicIdentity from '../types/PublicIdentity'
import AttestationUtils from './Attestation.utils'

export default class Attestation implements IAttestation {
  /**
   * [STATIC] [ASYNC] Queries the chain for a given attestation, by `claimHash`.
   *
   * @param claimHash - The hash of the claim that corresponds to the attestation to query.
   * @returns A promise containing the [[Attestation]] or null.
   * @example ```javascript
   * Attestation.query('0xd8024cdc147c4fa9221cd177').then(attestation => {
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
   * @param identity - The identity used to revoke the attestation (should be an attester identity, or have delegated rights).
   * @returns A promise containing the SubmittableResult (transaction status).
   * @example ```javascript
   * Attestation.revoke('0xd8024cdc147c4fa9221cd177').then(() => {
   *   // the attestation was successfully revoked
   * });
   * ```
   */
  public static async revoke(
    claimHash: string,
    identity: Identity
  ): Promise<SubmittableResult> {
    return revoke(claimHash, identity)
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
   * @param attesterPublicIdentity - The attesters public identity, used to attest the underlying claim.
   * @returns A new [[Attestation]] object.
   * @example ```javascript
   * // create a complete new attestation from the RequestForAttestation and all other needed properties
   * Attestation.fromRequestAndPublicIdentity(request, attesterPublicIdentity);
   * ```
   */
  public static fromRequestAndPublicIdentity(
    request: IRequestForAttestation,
    attesterPublicIdentity: IPublicIdentity
  ): Attestation {
    return new Attestation({
      claimHash: request.rootHash,
      cTypeHash: request.claim.cTypeHash,
      delegationId: request.delegationId,
      owner: attesterPublicIdentity.address,
      revoked: false,
    })
  }

  public static isAttestation(
    input: Partial<IAttestation>
  ): input is IAttestation {
    // TODO implement querying the chain when available
    // implement verification of delegationId once chain connection is established
    if (!input.cTypeHash || !validateHash(input.cTypeHash, 'CType')) {
      throw new Error('CType Hash not provided')
    }
    if (!input.claimHash || !validateHash(input.claimHash, 'Claim')) {
      throw new Error('Claim Hash not provided')
    }
    if (
      typeof input.delegationId !== 'string' &&
      !input.delegationId === null
    ) {
      throw new Error(`Not a valid DelegationId: ${typeof input.delegationId}`)
    }
    if (!input.owner || !validateAddress(input.owner, 'Owner')) {
      throw new Error('Owner not provided')
    }
    if (typeof input.revoked !== 'boolean') {
      throw new Error('revocation bit not provided')
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
    Attestation.isAttestation(attestationInput)
    this.owner = attestationInput.owner
    this.claimHash = attestationInput.claimHash
    this.cTypeHash = attestationInput.cTypeHash
    this.delegationId = attestationInput.delegationId
    this.revoked = attestationInput.revoked
  }

  /**
   * [ASYNC] Stores the attestation on chain.
   *
   * @param identity - The identity used to store the attestation.
   * @returns A promise containing the SubmittableResult (transaction status).
   * @example ```javascript
   * // Use [[store]] to store an attestation on chain, and to create an [[AttestedClaim]] upon success:
   * attestation.store(attester).then(() => {
   *   // the attestation was successfully stored, so now we can for example create an AttestedClaim
   * });
   * ```
   */
  public async store(identity: Identity): Promise<SubmittableResult> {
    return store(this, identity)
  }

  /**
   * [ASYNC] Revokes the attestation. Also available as a static method.
   *
   * @param identity - The identity used to revoke the attestation (should be an attester identity, or have delegated rights).
   * @returns A promise containing the SubmittableResult (transaction status).
   * @example ```javascript
   * attestation.revoke(identity).then(() => {
   *   // the attestation was successfully revoked
   * });
   * ```
   */
  public async revoke(identity: Identity): Promise<SubmittableResult> {
    return revoke(this.claimHash, identity)
  }

  /**
   * [STATIC] [ASYNC] Queries an attestation from the chain and checks its validity.
   *
   * @param attestation - The Attestation to verify.
   * @param claimHash - The hash of the claim that corresponds to the attestation to check. Defaults to the claimHash for the attestation onto which "verify" is called.
   * @returns A promise containing whether the attestation is valid.
   * @example ```javascript
   * attestation.verify().then(isVerified => {
   *   // `isVerified` is true if the attestation is verified, false otherwise
   * });
   * ```
   */
  public static async verify(
    attestation: IAttestation,
    claimHash: string = attestation.claimHash
  ): Promise<boolean> {
    // Query attestation by claimHash. null if no attestation is found on-chain for this hash
    const chainAttestation: Attestation | null = await query(claimHash)
    return Promise.resolve(
      !!(chainAttestation && chainAttestation.isAttestationValid(attestation))
    )
  }

  public async verify(): Promise<boolean> {
    return Attestation.verify(this)
  }

  private static constructorInputCheck(attestationInput: IAttestation): void {
    const blake2bPattern = new RegExp('(0x)[A-F0-9]{64}', 'i')
    if (
      !attestationInput.cTypeHash ||
      !attestationInput.claimHash ||
      !attestationInput.owner
    ) {
      throw new Error(
        `Property not provided while building Attestation!\n
        attestationInput.cTypeHash:\n
        ${attestationInput.cTypeHash}\n
        attestationInput.claimHash:\n
        ${attestationInput.claimHash}\n
        attestationInput.owner:\n
        ${attestationInput.owner}`
      )
    }
    if (!attestationInput.claimHash.match(blake2bPattern)) {
      throw new Error(
        `Provided claimHash malformed:\n
        ${attestationInput.claimHash}`
      )
    }
    if (!attestationInput.cTypeHash.match(blake2bPattern)) {
      throw new Error(
        `Provided cTypeHash malformed:\n
        ${attestationInput.cTypeHash}`
      )
    }
    if (!checkAddress(attestationInput.owner, 42)[0]) {
      throw new Error(`Owner address provided invalid`)
    }
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
   * [STATIC] Builds an [[Attestation]] from the decompressed array.
   *
   * @param attestation The [[CompressedAttestation]] that should get decompressed.
   * @returns A new [[Attestation]] object.
   */
  public static decompress(attestation: CompressedAttestation): Attestation {
    const decompressedAttestation = AttestationUtils.decompress(attestation)
    return Attestation.fromAttestation(decompressedAttestation)
  }

  /**
   * Checks if the attestation is valid. An attestation is valid if it:
   * * exists;
   * * and has the correct owner;
   * * and is not revoked.
   *
   * @param attestation - The attestation to check.
   * @returns Whether the attestation is valid.
   */
  private isAttestationValid(attestation: IAttestation): boolean {
    return this.owner === attestation.owner && !this.revoked
  }
}
