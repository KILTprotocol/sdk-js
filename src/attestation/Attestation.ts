import SubmittableExtrinsic from '@polkadot/api/promise/SubmittableExtrinsic'
import { Codec } from '@polkadot/types/types'

import Blockchain from '../blockchain/Blockchain'
import { BlockchainStorable } from '../blockchain/BlockchainStorable'
import { IClaim } from '../claim/Claim'
import { factory } from '../config/ConfigLog'
import Crypto from '../crypto'
import Identity from '../identity/Identity'

const log = factory.getLogger('Attestation')

export interface IAttestation {
  claimHash: string
  signature: string
  owner: string
  revoked: boolean
}

class Attestation extends BlockchainStorable implements IAttestation {
  public static fromObject(obj: IAttestation): Attestation {
    const newAttestation: Attestation = Object.create(Attestation.prototype)
    return Object.assign(newAttestation, obj)
  }

  public static async queryAll(
    blockchain: Blockchain,
    hash: string
  ): Promise<Attestation[]> {
    const query: Codec | null | undefined = await Attestation.doQueryChain(
      blockchain,
      hash
    )
    const value = query && query.encodedLength ? query.toJSON() : null
    let attestations: Attestation[] = []
    if (value instanceof Array) {
      attestations = value
        .map((attestationTuple: any[]) => {
          return {
            claimHash: attestationTuple[0],
            owner: attestationTuple[1],
            signature: attestationTuple[2],
            revoked: attestationTuple[3],
          } as IAttestation
        })
        .map(attestationStruct => {
          return Attestation.fromObject(attestationStruct)
        })
    }
    log.debug(
      () =>
        `Found ${attestations.length} attestation(s): ${JSON.stringify(
          attestations
        )}`
    )
    return Promise.resolve(attestations)
  }

  /**
   * Verifies that there is a non-revoked attestation for the given `claim` signed by `attester` on the blockchain.
   *
   * @param blockchain the blockchain API object
   * @param claim the claim to check
   * @param attester the attester the attestation must be signed with
   */
  public static async verify(
    blockchain: Blockchain,
    claim: IClaim,
    attester: Identity
  ): Promise<boolean> {
    const attestation: Attestation = new Attestation(claim, attester)
    return attestation.verify(blockchain)
  }

  private static async doQueryChain(
    blockchain: Blockchain,
    hash: string
  ): Promise<Codec | null | undefined> {
    log.debug(() => `Query chain for attestations with hash ${hash}`)
    const result:
      | Codec
      | null
      | undefined = await blockchain.api.query.attestation.attestations(hash)
    log.debug(() => `Result: ${result}`)
    return result
  }

  public claimHash: string
  public signature: string
  public owner: string
  public revoked: boolean

  constructor(claim: IClaim, attester: Identity, revoked = false) {
    super()
    this.owner = attester.address
    this.claimHash = Crypto.hashStr(JSON.stringify(claim))
    this.signature = attester.signStr(this.claimHash)
    this.revoked = revoked
  }

  public revoke() {
    log.debug(() => `Revoking attestations with hash ${this.getHash()}`)
    // TODO revoke onChain
  }

  public async verify(
    blockchain: Blockchain,
    claimHash: string = this.claimHash
  ): Promise<boolean> {
    // 1) Query attestations for claimHash
    const attestations: Attestation[] = await Attestation.queryAll(
      blockchain,
      claimHash
    )
    // 2) Find non-revoked attestation signed by this attestations' owner
    const verifiedAttestation = attestations.find(
      (attestation: Attestation) => {
        return attestation.signedWith(this.owner) && !attestation.revoked
      }
    )
    const attestationValid: boolean = verifiedAttestation !== undefined
    if (!attestationValid) {
      log.debug(() => 'No valid attestation found')
    }
    return Promise.resolve(attestationValid)
  }

  /**
   * Checks if the attestation is signed by the given `attester`.
   *
   * @param attester the address of the attester
   */
  public signedWith(attester: string): boolean {
    return Crypto.verify(this.claimHash, this.signature, attester)
  }

  protected getHash(): string {
    return this.claimHash
  }

  protected async submit(
    blockchain: Blockchain,
    signature: Uint8Array
  ): Promise<SubmittableExtrinsic> {
    log.debug(() => `Submitting attestation with hash ${this.getHash()}`)
    return blockchain.api.tx.attestation.add(this.getHash(), signature)
  }

  protected async query(
    blockchain: Blockchain,
    hash: string
  ): Promise<Codec | null | undefined> {
    return Attestation.doQueryChain(blockchain, hash)
  }
}

export default Attestation
