/**
 * Attestations are used to certify [[Claim]] objects, which are then written on the [[Blockchain]].
 * ***
 *  Attestation issued by the Attester is sent to and stored with the claimer. We call these [[AttestedClaim]]s "Credentials".
 *
 *  Attestation objects are stored on a map within the [[Blockchain]], with the claimHash as a key and a tuple of [[CType]] hash, account, delegationId and revoked flag. The Attester can revoke a [[Claim]].
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
import { revoke, query, store } from './Attestation.chain'
import ICType from '../types/CType'
import IPublicIdentity from '../types/PublicIdentity'
import { IDelegationBaseNode } from '../types/Delegation'

const log = factory.getLogger('Attestation')

export default class Attestation implements IAttestation {
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
   * Creates a new instance of this Attestation class from the given interface.
   */
  public static fromObject(obj: IAttestation): Attestation {
    return new Attestation(
      obj.claimHash,
      obj.cTypeHash,
      obj.owner,
      obj.delegationId,
      obj.revoked
    )
  }

  public claimHash: IAttestation['claimHash']
  public cTypeHash: IAttestation['cTypeHash']
  public owner: IAttestation['owner']
  public revoked: IAttestation['revoked']
  public delegationId?: IAttestation['delegationId']

  public constructor(
    claimHash: string,
    cTypeHash: ICType['hash'],
    attestationOwner: IPublicIdentity['address'],
    delegationId?: IDelegationBaseNode['id'],
    revoked?: boolean
  ) {
    this.owner = attestationOwner
    this.claimHash = claimHash
    this.cTypeHash = cTypeHash
    this.delegationId = delegationId
    if (revoked !== undefined) {
      this.revoked = revoked
    } else {
      this.revoked = false
    }
  }

  public async store(identity: Identity): Promise<TxStatus> {
    return store(this, identity)
  }

  public async revoke(identity: Identity): Promise<TxStatus> {
    return revoke(this.claimHash, identity)
  }

  public async verify(claimHash: string = this.claimHash): Promise<boolean> {
    // 1) Query attestations for claimHash
    const attestation: Attestation | null = await query(claimHash)
    // 2) check attestation for being valied, having the correct owner and not being revoked
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
