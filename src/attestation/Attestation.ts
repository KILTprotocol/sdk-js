/**
 * Attestation provides the KILT ecosystem with certifying [[Claim]] objects, which are then written on the [[Blockchain]].
 * ***
 *  Attestation issued by the Attester is sent to and stored with the claimer. We call these [[AttestedClaim]]s Credentials.
 *
 * Attestation objects are stored on a map within the [[Blockchain]], the claimHash used as a key and a tuple of [[CType]] hash, account, delegation-id and revoked.
 * The Attester can [[revoke]] a [[Claim]].
 * @module Attestation
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

  public static async query(claimHash: string): Promise<Attestation | null> {
    return query(claimHash)
  }

  public static async revoke(
    claimHash: string,
    identity: Identity
  ): Promise<TxStatus> {
    return revoke(claimHash, identity)
  }

  /**
   * [STATIC] Creates a new instance of this Attestation class from the given interface.
   * @param `obj`
   * @returns `Attestation`
   * @example
   * ```javascript
   * const attestationTuple = encodedQueryResult.toJSON();
   * const attestationObj: IAttestation = {
   *    claimHash,
   *    cTypeHash: attestationTuple[0],
   *    owner: attestationTuple[1],
   *    delegationId: attestationTuple[2],
   *    revoked: attestationTuple[3],
   * };
   * const attestation = Attestation.fromObject(attestation)
   * ```
   */
  public static fromObject(obj: IAttestation): Attestation {
    const newAttestation: Attestation = Object.create(Attestation.prototype)
    return Object.assign(newAttestation, obj)
  }

  /**
   * @description Stores the Attestation on chain. Async.
   * @param identity Account used to store the attestation.
   * @returns Promise containing the [[TxStatus]].
   * @example Use [store] to store an attestation on chain, and to create an [[AttestedClaim]] upon success:
   * ```javascript
   * // connect to the blockchain
   * Kilt.default.connect('wss://full-nodes.kilt.io:9944');
   * 
   * // store the attestation on chain
   * attestation.store(attester).then(() => {
   *    // attestation was successfully stored so we can create an AttestedClaim
   *    const attestedClaim = new Kilt.AttestedClaim(requestForAttestation, attestation);
   * }).catch(e => {
   *    console.log(e);
   * }).finally(() => {
   *    // disconnect from the blockchain
   *    Kilt.BlockchainApiConnection.getCached().then(blockchain => {
   *      blockchain.api.disconnect()
   *    });
   * });
   * ```
   */
  public async store(identity: Identity): Promise<TxStatus> {
    return store(this, identity)
  }

  public async revoke(identity: Identity): Promise<TxStatus> {
    return revoke(this.claimHash, identity)
  }

  /**
   * Queries the chain and returns whether the attestation is valid. An attestation is valid if it exist on chain, has the correct owner, and is not revoked.
   * @param `claimHash` The hash of the claim to check.
   * @returns A promise containing the boolean `attestationValid`.
   * @example 
   * ```javascript
   * attestation.verify().then(isVerified => {
   *    console.log('isVerified', isVerified);
   * });
   * ```
   */
  public async verify(claimHash: string = this.claimHash): Promise<boolean> {
    // Query attestation by claimHash
    const attestation: Attestation | null = await query(claimHash)
    // Check if attestation is valid
    const attestationValid: boolean =
      attestation !== null &&
      attestation.owner === this.owner &&
      !attestation.revoked
    if (!attestationValid) {
      log.debug(() => 'No valid attestation found')
    }
    return Promise.resolve(attestationValid)
  }
}
