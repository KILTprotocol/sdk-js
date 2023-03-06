/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { DidUri, ICredential, ICType } from '@kiltprotocol/types'

import { fromICredential as vcFromCredential } from './KiltCredentialV1.js'
import { fromICredential as proofFromCredential } from './KiltAttestationProofV1.js'
import type { KiltAttestationProofV1, VerifiableCredential } from './types.js'

/**
 * Transforms an [[ICredential]] object to conform to the KiltCredentialV1 data model.
 *
 * @param input An [[ICredential]] object.
 * @param issuer The issuer of the attestation to this credential (attester).
 * @param chainGenesisHash Genesis hash of the chain against which the credential is verifiable.
 * @param blockHash Hash of any block at which the credential is verifiable (i.e. Attested and not revoked).
 * @param timestamp Timestamp of the block referenced by blockHash in milliseconds since January 1, 1970, UTC (UNIX epoch).
 * @param ctype Optional: The CType object referenced by the [[ICredential]].
 * @returns A KiltCredentialV1 with embedded KiltAttestationProofV1 proof.
 */
export function exportICredentialToVc(
  input: ICredential,
  issuer: DidUri,
  chainGenesisHash: Uint8Array,
  blockHash: Uint8Array,
  timestamp: number,
  ctype?: ICType
): VerifiableCredential & { proof: KiltAttestationProofV1 } {
  const proof = proofFromCredential(input, blockHash)
  return {
    ...vcFromCredential(input, issuer, chainGenesisHash, timestamp, ctype),
    proof,
  }
}
