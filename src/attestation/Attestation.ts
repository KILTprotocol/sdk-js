import SubmittableExtrinsic from '@polkadot/api/promise/SubmittableExtrinsic';
import { Codec } from '@polkadot/types/types';

import Blockchain from '../blockchain/Blockchain';
import { BlockchainStorable } from '../blockchain/BlockchainStorable';
import { IClaim } from '../claim/Claim';
import { factory } from "../config/ConfigLog";
import Identity from '../identity/Identity';
import * as AttestationUtils from './AttestationUtils';



const log = factory.getLogger("Attestation");

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

  public static async queryAll(blockchain: Blockchain, hash: string): Promise<Attestation[]> {
    const query: Codec | null | undefined = await Attestation.doQueryChain(blockchain, hash)
    const value = query && query.encodedLength ? query.toJSON() : null
    let attestations: Attestation[] = []
    if (value instanceof Array) {
      attestations = value.map((attestationTuple:any[]) => {
        return {
          claimHash: attestationTuple[0],
          owner: attestationTuple[1],
          signature: attestationTuple[2],
          revoked: attestationTuple[3],
        } as IAttestation
      })
        .map((attestationStruct) => {
          return Attestation.fromObject(attestationStruct)
        })
    }
    log.debug(() => `Found ${attestations.length} attestation(s): ${JSON.stringify(attestations)}`);
    return Promise.resolve(attestations)
  }

  public claimHash: string
  public signature: string
  public owner: string
  public revoked: boolean

  constructor(claim: IClaim, attester: Identity, revoked = false) {
    super()
    this.owner = attester.address
    this.claimHash = AttestationUtils.generateClaimHash(claim)
    this.signature = AttestationUtils.signStr(this.claimHash, attester)
    this.revoked = revoked
  }

  public revoke() {
    log.debug(() => `Revoking attestations with hash ${this.getHash()}`);
    // TODO revoke onChain
  }

  public async verify(blockchain: Blockchain): Promise<boolean> {
    log.debug(() => `Verifying attestations with hash ${this.getHash()}`);
    const attestations: Attestation[] = await Attestation.queryAll(blockchain, this.getHash());
    let validAttestations: number = 0
    attestations.forEach((attestation) => {
      if (!attestation.revoked) {
        validAttestations++
      }
    })
    return validAttestations === attestations.length && validAttestations > 0
  }

  protected getHash(): string {
    return this.claimHash
  }

  protected async submit(blockchain: Blockchain, signature: Uint8Array): Promise<SubmittableExtrinsic> {
    log.debug(() => `Submitting attestation with hash ${this.getHash()}`);
    return blockchain.api.tx.attestation.add(this.getHash(), signature)
  }

  protected async query(blockchain: Blockchain, hash: string): Promise<Codec | null | undefined> {
    return Attestation.doQueryChain(blockchain, hash)
  }

  private static async doQueryChain(blockchain: Blockchain, hash: string): Promise<Codec | null | undefined> {
    log.debug(() => `Query chain for attestations with hash ${hash}`);
    const result: Codec | null | undefined = await blockchain.api.query.attestation.attestations(hash)
    log.debug(() => `Result: ${result}`);
    return result
  }
}

export default Attestation
