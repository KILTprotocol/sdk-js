/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module RequestForAttestation.Compression
 */

import type {
  ICredential,
  CompressedCredential,
  CompressedRequestForAttestation,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import * as CredentialUtils from '../credential/Credential.utils.js'
import * as ClaimCompression from '../claim/compression.js'
import {
  verifyDataStructure,
  verifyDataIntegrity,
} from './requestforattestation.js'

/**
 *  Compresses [[Credential]]s which are made up from an [[Attestation]] and [[RequestForAttestation]] for storage and/or message.
 *
 * @param leg An array of [[Attestation]] and [[RequestForAttestation]] objects.
 *
 * @returns An ordered array of [[Credential]]s.
 */

export function compressLegitimation(
  leg: ICredential[]
): CompressedCredential[] {
  return leg.map(CredentialUtils.compress)
}

/**
 *  Decompresses [[Credential]]s which are an [[Attestation]] and [[RequestForAttestation]] from storage and/or message.
 *
 * @param leg A compressed [[Attestation]] and [[RequestForAttestation]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[Credential]].
 */

function decompressLegitimation(leg: CompressedCredential[]): ICredential[] {
  return leg.map(CredentialUtils.decompress)
}

/**
 *  Compresses a [[RequestForAttestation]] for storage and/or messaging.
 *
 * @param reqForAtt A [[RequestForAttestation]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[RequestForAttestation]].
 */

export function compress(
  reqForAtt: IRequestForAttestation
): CompressedRequestForAttestation {
  verifyDataStructure(reqForAtt)
  return [
    ClaimCompression.compress(reqForAtt.claim),
    reqForAtt.claimNonceMap,
    reqForAtt.claimerSignature,
    reqForAtt.claimHashes,
    reqForAtt.rootHash,
    compressLegitimation(reqForAtt.legitimations),
    reqForAtt.delegationId,
  ]
}

/**
 *  Decompresses a [[RequestForAttestation]] from storage and/or message.
 *
 * @param reqForAtt A compressed [[RequestForAttestation]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when reqForAtt is not an Array and it's length is not equal to the defined length of 8.
 *
 * @returns An object that has the same properties as a [[RequestForAttestation]].
 */

export function decompress(
  reqForAtt: CompressedRequestForAttestation
): IRequestForAttestation {
  if (!Array.isArray(reqForAtt) || reqForAtt.length !== 7) {
    throw SDKErrors.ERROR_DECOMPRESSION_ARRAY('Request for Attestation')
  }
  return {
    claim: ClaimCompression.decompress(reqForAtt[0]),
    claimNonceMap: reqForAtt[1],
    claimerSignature: reqForAtt[2],
    claimHashes: reqForAtt[3],
    rootHash: reqForAtt[4],
    legitimations: decompressLegitimation(reqForAtt[5]),
    delegationId: reqForAtt[6],
  }
}

/**
 * Builds an [[RequestForAttestation]] from the decompressed array.
 *
 * @param reqForAtt The [[CompressedRequestForAttestation]] that should get decompressed.
 * @returns A new [[RequestForAttestation]] object.
 */
export function decompressAndVerify(
  reqForAtt: CompressedRequestForAttestation
): IRequestForAttestation {
  const decompressedRequestForAttestation = decompress(reqForAtt)
  verifyDataStructure(decompressedRequestForAttestation)
  verifyDataIntegrity(decompressedRequestForAttestation)
  return decompressedRequestForAttestation
}
