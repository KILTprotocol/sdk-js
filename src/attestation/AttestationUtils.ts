import Hash from '@polkadot/types/Hash';
import { ExtrinsicStatus } from '@polkadot/types/index';
import Blockchain from '../blockchain/Blockchain';
import Crypto from '../crypto';
import Identity from '../identity/Identity';
import { IClaim } from 'src';


export function generateClaimHash(claim: IClaim): string {
  return Crypto.hashStr(JSON.stringify(claim))
}

export function sign(claimHash: string, identity: Identity) : Uint8Array {
  return Crypto.sign(claimHash, identity.signKeyPair.secretKey)
}

export function signStr(claimHash: string, identity: Identity) : string {
  return Crypto.signStr(claimHash, identity.signKeyPair.secretKey)
}

export async function verifyStored(
  blockchain: Blockchain,
  claimHash: string
): Promise<any> {
  // @ts-ignore
  const result = await blockchain.api.query.attestation.attestations(claimHash)
  return result && result.encodedLength ? result.toJSON() : null
}

export async function store(
  blockchain: Blockchain,
  identity: Identity,
  claimHash: string,
  onsuccess?: () => void
): Promise<Hash> {
  const signature = sign(claimHash, identity)
  // @ts-ignore
  const attestationAdd = await blockchain.api.tx.attestation.add(claimHash, signature)
  return blockchain.submitTx(identity, attestationAdd, (status: ExtrinsicStatus) => {
    if (
      onsuccess &&
      status.type === 'Finalised' &&
      status.value &&
      status.value.encodedLength > 0
    ) {
      onsuccess()
    }
  })
}
