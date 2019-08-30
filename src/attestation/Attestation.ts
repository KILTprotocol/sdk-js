/**
 * @module Attestation
 *
 *  --- Overview ---
 *
 *  The Attestation module is used to attest claims.
 *
 *  The attestation is issued by the attester, sent to and stored with the claimer. We call these attested claims Credentials.
 *
 *  Attestations will be service providers in the KILT ecosystem and the objects will be written on the blockchain.
 *
 *  An Attestation in the real-world could be the execution of a property deed or a contract for work done.
 *
 *  --- Usage ---
 *
 * Storing an attestation
 *
 * Storing an attestation must be performed with the attester’s identity (owner)
 * Attestation object can be stored in a map on the blockchain, with the claimHash as the key and a tuple of CTYPE hash, owner address a revoked as the value.
 * While the Credentials could be used and verified without writing the corresponding attestations to the chain, it is done to provide an immutable decentralised source of the status (valid or revoked) for the Credential.
 *
 * Revoke an Attestation,
 *
 * To revoke an Attestation, the Attestation has to be stored on chain. Once the revocation is
 * invoked, it will set the revoked flag to true and update the Attestation entity on-chain.
 * A revoked attestation entity can still be queried from the chain, but a verification check will
 * fail.
 *
 */
import TxStatus from '../blockchain/TxStatus'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import IAttestation from '../types/Attestation'
import IRequestForAttestation from '../types/RequestForAttestation'
import { revoke, query, store } from './Attestation.chain'

const log = factory.getLogger('Attestation')

export default class Attestation implements IAttestation {
  public static async query(
    claimHash: string
  ): Promise<Attestation | undefined> {
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
    const newAttestation: Attestation = Object.create(Attestation.prototype)
    return Object.assign(newAttestation, obj)
  }

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

  public async store(identity: Identity): Promise<TxStatus> {
    return store(this, identity)
  }

  public async revoke(identity: Identity): Promise<TxStatus> {
    return revoke(this.claimHash, identity)
  }

  public async verify(claimHash: string = this.claimHash): Promise<boolean> {
    // 1) Query attestations for claimHash
    const attestation: Attestation | undefined = await query(claimHash)
    // 2) check attestation for being valied, having the correct owner and not being revoked
    const attestationValid: boolean =
      attestation !== undefined &&
      attestation.owner === this.owner &&
      !attestation.revoked
    if (!attestationValid) {
      log.debug(() => 'No valid attestation found')
    }
    return Promise.resolve(attestationValid)
  }
}
