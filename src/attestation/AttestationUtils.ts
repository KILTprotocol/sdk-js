import { IClaim } from '../claim/Claim';
import Crypto from '../crypto';
import Identity from '../identity/Identity';


export function generateClaimHash(claim: IClaim): string {
  return Crypto.hashStr(JSON.stringify(claim))
}

export function sign(claimHash: string, identity: Identity): Uint8Array {
  return Crypto.sign(claimHash, identity.signKeyPair.secretKey)
}

export function signStr(claimHash: string, identity: Identity): string {
  return Crypto.signStr(claimHash, identity.signKeyPair.secretKey)
}
