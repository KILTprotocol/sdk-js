/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */
import { ICredential } from '@kiltprotocol/types'
import { hexToU8a, stringToU8a, u8aCmp } from '@polkadot/util'
import { base58Encode } from '@polkadot/util-crypto'
import { ATTESTATION_PROOF_V1_TYPE } from './constants'
import { KiltAttestationProofV1 } from './types'


/**
 * Produces an instance of [[KiltAttestationProofV1]] from an [[ICredential]]. 
 *
 * @param credential
 * @param blockHash
 */
export function fromICredential(
  credential: ICredential,
  blockHash: Uint8Array
): KiltAttestationProofV1 {
  // `block` field is base58 encoding of block hash
  const block = base58Encode(blockHash)
  // `commitments` (claimHashes) are base58 encoded in new format
  const commitments = credential.claimHashes.map((i) =>
    base58Encode(hexToU8a(i))
  )
  // salt/nonces must be sorted by statment digest (keys) and base58 encoded
  const revealProof = Object.entries(credential.claimNonceMap)
    .map(([hash, salt]) => [hexToU8a(hash), stringToU8a(salt)])
    .sort((a, b) => u8aCmp(a[0], b[0]))
    .map((i) => base58Encode(i[1]))
  return {
    type: ATTESTATION_PROOF_V1_TYPE,
    block,
    commitments,
    revealProof,
  }
}
