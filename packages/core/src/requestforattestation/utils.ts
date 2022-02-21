/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module RequestForAttestationUtils
 */

import type {
  Hash,
  IDelegationNode,
  ICredential,
  IRequestForAttestation,
  DidPublicKey,
  KeystoreSigner,
  DidKey,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { DidDetails } from '@kiltprotocol/did'
import { hashClaimContents } from '../claim/utils.js'

function getHashRoot(leaves: Uint8Array[]): Uint8Array {
  const result = Crypto.u8aConcat(...leaves)
  return Crypto.hash(result)
}

function getHashLeaves(
  claimHashes: Hash[],
  legitimations: ICredential[],
  delegationId: IDelegationNode['id'] | null
): Uint8Array[] {
  const result: Uint8Array[] = []
  claimHashes.forEach((item) => {
    result.push(Crypto.coToUInt8(item))
  })
  if (legitimations) {
    legitimations.forEach((legitimation) => {
      result.push(Crypto.coToUInt8(legitimation.attestation.claimHash))
    })
  }
  if (delegationId) {
    result.push(Crypto.coToUInt8(delegationId))
  }

  return result
}

export function calculateRootHash(
  request: Partial<IRequestForAttestation>
): Hash {
  const hashes: Uint8Array[] = getHashLeaves(
    request.claimHashes || [],
    request.legitimations || [],
    request.delegationId || null
  )
  const root: Uint8Array = getHashRoot(hashes)
  return Crypto.u8aToHex(root)
}

/**
 * Removes [[Claim]] properties from the [[RequestForAttestation]] object, provides anonymity and security when building the [[createPresentation]] method.
 *
 * @param req4Att - The RequestForAttestation object to remove properties from.
 * @param properties - Properties to remove from the [[Claim]] object.
 * @throws [[ERROR_CLAIM_HASHTREE_MISMATCH]] when a property which should be deleted wasn't found.
 * @example ```javascript
 * const rawClaim = {
 *   name: 'Alice',
 *   age: 29,
 * };
 * const claim = Claim.fromCTypeAndClaimContents(ctype, rawClaim, alice);
 * const reqForAtt = RequestForAttestation.fromClaim(claim);
 * RequestForAttestation.removeClaimProperties(reqForAtt, ['name']);
 * // reqForAtt does not contain `name` in its claimHashTree and its claim contents anymore.
 * ```
 */
export function removeClaimProperties(
  req4Att: IRequestForAttestation,
  properties: string[]
): void {
  properties.forEach((key) => {
    // eslint-disable-next-line no-param-reassign
    delete req4Att.claim.contents[key]
  })
  // eslint-disable-next-line no-param-reassign
  req4Att.claimNonceMap = hashClaimContents(req4Att.claim, {
    nonces: req4Att.claimNonceMap,
  }).nonceMap
}

export function makeSigningData(
  input: IRequestForAttestation,
  challenge?: string
): Uint8Array {
  return new Uint8Array([
    ...Crypto.coToUInt8(input.rootHash),
    ...Crypto.coToUInt8(challenge),
  ])
}

export async function addSignature(
  req4Att: IRequestForAttestation,
  sig: string | Uint8Array,
  keyId: DidPublicKey['id'],
  {
    challenge,
  }: {
    challenge?: string
  } = {}
): Promise<void> {
  const signature = typeof sig === 'string' ? sig : Crypto.u8aToHex(sig)
  // eslint-disable-next-line no-param-reassign
  req4Att.claimerSignature = { signature, keyId, challenge }
}

export async function signWithDidKey(
  req4Att: IRequestForAttestation,
  signer: KeystoreSigner,
  didDetails: DidDetails,
  keyId: DidKey['id'],
  {
    challenge,
  }: {
    challenge?: string
  } = {}
): Promise<void> {
  const { signature, keyId: signatureKeyId } = await didDetails.signPayload(
    makeSigningData(req4Att, challenge),
    signer,
    keyId
  )
  return addSignature(req4Att, signature, signatureKeyId, { challenge })
}
