/**
 * An [[Attestation]] certifies a [[Claim]], sent by a claimer in the form of a [[RequestForAttestation]]. [[Attestation]]s are **written on the blockchain** and are **revokable**.
 * Note: once an [[Attestation]] is stored, it can be sent to and stored with the claimer as an [[AttestedClaim]] (= "Credential").
 * ***
 * An [[Attestation]] can be queried from the chain. It's stored on-chain in a map:
 * * the key is the hash of the corresponding claim;
 * * the value is a tuple ([[CType]] hash, account, id of the [[Delegation]], and revoked flag).
 * @module Attestation
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import TxStatus from '../blockchain/TxStatus'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import IAttestation from '../types/Attestation'
import IRequestForAttestation from '../types/RequestForAttestation'
import { revoke, query, store } from './Attestation.chain'

const log = factory.getLogger('Attestation')

export default class Attestation implements IAttestation {
  public claimHash: IAttestation['claimHash']
  public cTypeHash: IAttestation['cTypeHash']
  public owner: IAttestation['owner']
  public revoked: IAttestation['revoked']
  public delegationId?: IAttestation['delegationId']

  /**
   * @description Builds a new [[Attestation]] instance.
   * @param requestForAttestation A request for attestation, usually sent by a claimer.
   * @param attester The identity of the attester.
   * @param revoked A flag indicating whether the attestation should be revoked.
   * @example
   * ```javascript
   * const attestation = new Kilt.Attestation(requestForAttestation, attester);
   * ```
   * About this example:
   * * To create `requestForAttestation`, see [[RequestForAttestation]]'s constructor.
   * * To create `attester`, see [[buildFromMnemonic]] and [[generateMnemonic]] in [[Identity]].
   */
  public constructor(
    requestForAttestation: IRequestForAttestation,
    attester: Identity,
    revoked = false
  ) {
    this.owner = attester.address
    this.claimHash = requestForAttestation.hash
    this.cTypeHash = requestForAttestation.claim.cType
    this.delegationId = requestForAttestation.delegationId
    this.revoked = revoked
  }

  /**
   * @description (STATIC) (ASYNC) Queries the chain about a given attestation, by `claimHash`.
   * @param claimHash The hash of the claim that corresponds to the attestation to query.
   * @returns A promise containing the [[Attestation]] or `null`.
   * @example
   * ```javascript
   * const attestation = await Attestation.query("0xd810224b1b6a4db8d1d1e909d1aeb7d441846914ed024cdc147c4fa9221cd177");
   * ```
   */
  public static async query(claimHash: string): Promise<Attestation | null> {
    return query(claimHash)
  }

  /**
   * @description (STATIC) (ASYNC) Revokes an attestation.
   * @param claimHash The hash of the claim that corresponds to the attestation to revoke.
   * @param identity The identity used to revoke the attestation (should be an attester identity, or have delegated rights).
   * @returns A promise containing the [[TxStatus]] (transaction status).
   * @example
   * ```javascript
   * Attestation.revoke("0xd810224b1b6a4db8d1d1e909d1aeb7d441846914ed024cdc147c4fa9221cd177", identity);
   * ```
   * About this example:
   * * To create `identity`, see [[buildFromMnemonic]] and [[generateMnemonic]] in [[Identity]].
   */
  public static async revoke(
    claimHash: string,
    identity: Identity
  ): Promise<TxStatus> {
    return revoke(claimHash, identity)
  }

  /**
   * @description (STATIC) Creates a new [[Attestation]] instance from the given interface.
   * @param obj The base object from which to create the attestation.
   * @returns A new attestation.
   * @example
   * ```javascript
   * // `encodedQueryResult` is the result of a chain query
   * const attestationTuple = encodedQueryResult.toJSON();
   *
   * // transform the tuple into an IAttestation object
   * const attestationObj: IAttestation = {
   *    claimHash,
   *    cTypeHash: attestationTuple[0],
   *    owner: attestationTuple[1],
   *    delegationId: attestationTuple[2],
   *    revoked: attestationTuple[3],
   * };
   *
   * // create an Attestation object
   * const attestation = Attestation.fromObject(attestationObj);
   * ```
   */
  public static fromObject(obj: IAttestation): Attestation {
    const newAttestation: Attestation = Object.create(Attestation.prototype)
    return Object.assign(newAttestation, obj)
  }

  /**
   * @description (ASYNC) Stores the attestation on chain.
   * @param identity The identity used to store the attestation.
   * @returns A promise containing the [[TxStatus]] (transaction status).
   * @example Use [[store]] to store an attestation on chain, and to create an [[AttestedClaim]] upon success:
   * ```javascript
   * // connect to the blockchain
   * Kilt.default.connect('wss://full-nodes.kilt.io:9944');
   *
   * // store the attestation on chain
   * attestation.store(attester).then(() => {
   *    // ... attestation was successfully stored so we could for exampl create an AttestedClaim
   * }).catch(e => {
   *    console.log(e);
   * }).finally(() => {
   *    // disconnect from the blockchain
   *    Kilt.BlockchainApiConnection.getCached().then(blockchain => {
   *      blockchain.api.disconnect();
   *    });
   * });
   * ```
   */
  public async store(identity: Identity): Promise<TxStatus> {
    return store(this, identity)
  }

  /**
   * @description (ASYNC) Revokes the attestation.
   * @param identity The identity used to revoke the attestation (should be an attester identity, or have delegated rights).
   * @returns A promise containing the [[TxStatus]] (transaction status).
   * @example
   * ```javascript
   * revoke(identity);
   * ```
   * About this example:
   * * To create an Attester `identity`, see [[buildFromMnemonic]] and [[generateMnemonic]] in [[Identity]].
   * * Note that the Attester must have rights or delegated rights in order to revoke the attestation.
   */
  public async revoke(identity: Identity): Promise<TxStatus> {
    return revoke(this.claimHash, identity)
  }

  /**
   * @description (ASYNC) Queries an attestation from the chain and checks its validity.
   * @param claimHash The hash of the claim that corresponds to the attestation to check, defaults to **this** `claimHash`.
   * @returns A promise containing the boolean `attestationValid`.
   * @example
   * ```javascript
   * attestation.verify().then(isVerified => {
   *    console.log('isVerified', isVerified);
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
   * @description Checks if the attestation is valid. An attestation is valid if it:
   * * exists;
   * * and has the correct owner;
   * * and is not revoked.
   * @param attestation The attestation to check.
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
