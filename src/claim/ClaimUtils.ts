import { IClaim } from './Claim'
import Crypto from '../crypto'
import Identity from '../identity/Identity'

export function generateClaimHash(claim: IClaim): string {
  return Crypto.hashStr(JSON.stringify(claim))
}

export function sign(claimHash: string, identity: Identity): Uint8Array {
  return identity.sign(claimHash)
}

export function signStr(claimHash: string, identity: Identity): string {
  return identity.signStr(claimHash)
}
