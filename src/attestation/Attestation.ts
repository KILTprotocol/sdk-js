import Hash from '@polkadot/types/Hash';
import { IClaim } from '../claim/Claim';
import { Blockchain, Identity } from '../index';
import * as AttestationUtils from './AttestationUtils';

export interface IAttestation {
  claimHash: string
  signature: string
  owner: string
  revoked: boolean
}

class Attestation implements IAttestation {
  public claimHash: string
  public signature: string
  public owner: string
  public revoked: boolean

  constructor(claim: IClaim, attester: Identity, revoked = false) {
    this.owner = attester.address
    this.claimHash = AttestationUtils.generateClaimHash(claim)
    this.signature = AttestationUtils.signStr(this.claimHash, attester)
    this.revoked = revoked
  }

  public revoke() {
    // TODO revoke onChain
  }

  public updateRevokeStatus() {
    // TODO check attestation onChain
  }

  public async store(
    blockchain: Blockchain,
    identity: Identity,
    onsuccess?: () => void
  ): Promise<Hash> {
    return AttestationUtils.store(blockchain, identity, this.claimHash, onsuccess)
  }
}

export default Attestation
