/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ICredential } from '@kiltprotocol/types'

import { fromICredential as vcFromCredential } from './KiltCredentialV1.js'
import { fromICredential as proofFromCredential } from './KiltAttestationProofV1.js'
import type { KiltAttestationProofV1, VerifiableCredential } from './types.js'

type Params = Parameters<typeof vcFromCredential>[1] &
  Parameters<typeof proofFromCredential>[1]

/**
 * Transforms an [[ICredential]] object to conform to the KiltCredentialV1 data model.
 *
 * @param input An [[ICredential]] object.
 * @param opts Additional required and optional parameters for producing a VC from an [[ICredential]].
 * @param opts.issuer The issuer of the attestation to this credential (attester).
 * @param opts.blockHash Hash of any block at which the credential is verifiable (i.e. Attested and not revoked).
 * @param opts.timestamp Timestamp of the block referenced by blockHash in milliseconds since January 1, 1970, UTC (UNIX epoch).
 * @param opts.chainGenesisHash Optional: Genesis hash of the chain against which this credential is verifiable. Defaults to the spiritnet genesis hash.
 * @param opts.cType Optional: The CType object referenced by the [[ICredential]].
 * @returns A KiltCredentialV1 with embedded KiltAttestationProofV1 proof.
 */
export function exportICredentialToVc(
  input: ICredential,
  { blockHash, issuer, chainGenesisHash, timestamp, cType }: Params
): VerifiableCredential & { proof: KiltAttestationProofV1 } {
  const proof = proofFromCredential(input, { blockHash })
  return {
    ...vcFromCredential(input, { issuer, chainGenesisHash, timestamp, cType }),
    proof,
  }
}
