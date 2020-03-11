/**
 * An [[Attestation]] certifies a [[Claim]], sent by a claimer in the form of a [[RequestForAttestation]]. [[Attestation]]s are **written on the blockchain** and are **revokable**.
 * Note: once an [[Attestation]] is stored, it can be sent to and stored with the claimer as an [[AttestedClaim]] ("Credential").
 *
 * An [[Attestation]] can be queried from the chain. It's stored on-chain in a map:
 * * the key is the hash of the corresponding claim;
 * * the value is a tuple ([[CType]] hash, account, id of the [[Delegation]], and revoked flag).
 *
 * @packageDocumentation
 * @module Attestation
 * @preferred
 */

import IRequestForAttestation from '../types/RequestForAttestation'
import TxStatus from '../blockchain/TxStatus'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import IAttestation, { CompressedAttestation } from '../types/Attestation'
import { revoke, query, store } from './Attestation.chain'
import IPublicIdentity from '../types/PublicIdentity'

const log = factory.getLogger('Attestation')

function attestationErrorCheck(attestation: IAttestation): void {
  if (!attestation.cTypeHash || !attestation.claimHash || !attestation.owner) {
    throw new Error(
      `Property Not Provided while building Attestation!\n
      attestation.cTypeHash:\n
      ${attestation.cTypeHash}\n
      attestation.claimHash:\n
      ${attestation.claimHash}\n
      attestation.owner:\n
      ${attestation.owner}`
    )
  }
}
/**
 *  Compresses an [[Attestation]] object into an array for storage and/or messaging.
 *
 * @param attestation An [[Attestation]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of an [[Attestation]].
 */

export function compressAttestation(
  attestation: IAttestation
): CompressedAttestation {
  attestationErrorCheck(attestation)
  return [
    attestation.claimHash,
    attestation.cTypeHash,
    attestation.owner,
    attestation.revoked,
    attestation.delegationId,
  ]
}

/**
 *  Decompresses an [[Attestation]] from storage and/or message into an object.
 *
 * @param attestation A compressesd [[Attestation]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an [[Attestation]].
 */

export function decompressAttestation(
  attestation: CompressedAttestation
): IAttestation {
  if (!Array.isArray(attestation) || attestation.length !== 5) {
    throw new Error(
      'Compressed Attestation isnt an Array or has all the required data types'
    )
  }
  return {
    claimHash: attestation[0],
    cTypeHash: attestation[1],
    owner: attestation[2],
    revoked: attestation[3],
    delegationId: attestation[4],
  }
}

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
   * @returns A promise containing the [[TxStatus]] (transaction status).
   * @example ```javascript
   * Attestation.revoke('0xd8024cdc147c4fa9221cd177').then(() => {
   *   // the attestation was successfully revoked
   * });
   * ```
   */
  public static async revoke(
    claimHash: string,
    identity: Identity
  ): Promise<TxStatus> {
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
    attestationErrorCheck(attestationInput)
    this.claimHash = attestationInput.claimHash
    this.cTypeHash = attestationInput.cTypeHash
    this.delegationId = attestationInput.delegationId
    this.owner = attestationInput.owner
    this.revoked = attestationInput.revoked
  }

  /**
   * [ASYNC] Stores the attestation on chain.
   *
   * @param identity - The identity used to store the attestation.
   * @returns A promise containing the [[TxStatus]] (transaction status).
   * @example ```javascript
   * // Use [[store]] to store an attestation on chain, and to create an [[AttestedClaim]] upon success:
   * attestation.store(attester).then(() => {
   *   // the attestation was successfully stored, so now we can for example create an AttestedClaim
   * });
   * ```
   */
  public async store(identity: Identity): Promise<TxStatus> {
    return store(this, identity)
  }

  /**
   * [ASYNC] Revokes the attestation. Also available as a static method.
   *
   * @param identity - The identity used to revoke the attestation (should be an attester identity, or have delegated rights).
   * @returns A promise containing the [[TxStatus]] (transaction status).
   * @example ```javascript
   * attestation.revoke(identity).then(() => {
   *   // the attestation was successfully revoked
   * });
   * ```
   */
  public async revoke(identity: Identity): Promise<TxStatus> {
    return revoke(this.claimHash, identity)
  }

  /**
   * [ASYNC] Queries an attestation from the chain and checks its validity.
   *
   * @param claimHash - The hash of the claim that corresponds to the attestation to check. Defaults to the claimHash for the attestation onto which "verify" is called.
   * @returns A promise containing whether the attestation is valid.
   * @example ```javascript
   * attestation.verify().then(isVerified => {
   *   // `isVerified` is true if the attestation is verified, false otherwise
   * });
   * ```
   */
  public async verify(claimHash: string = this.claimHash): Promise<boolean> {
    // Query attestation by claimHash. null if no attestation is found on-chain for this hash
    const attestation: Attestation | null = await query(claimHash)
    // Check if attestation is valid
    const isValid: boolean = this.isAttestationValid(attestation)
    if (!isValid) {
      log.debug(() => 'No valid attestation found')
    }
    return Promise.resolve(isValid)
  }

  /**
   * Compresses an [[Attestation]] object from the [[compressAttestation]].
   *
   * @returns An array that contains the same properties of an [[Attestation]].
   */

  public compress(): CompressedAttestation {
    return compressAttestation(this)
  }

  /**
   * [STATIC] Builds an [[Attestation]] from the decompressed array.
   *
   * @returns A new [[Attestation]] object.
   */

  public static decompress(attestation: CompressedAttestation): Attestation {
    const decompressedAttestation = decompressAttestation(attestation)
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
  private isAttestationValid(attestation: Attestation | null): boolean {
    return (
      attestation !== null &&
      attestation.owner === this.owner &&
      !attestation.revoked
    )
  }
}
