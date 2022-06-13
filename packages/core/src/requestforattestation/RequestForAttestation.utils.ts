/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  ICredential,
  CompressedCredential,
  CompressedRequestForAttestation,
  IRequestForAttestation,
  ICType,
} from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { isDidSignature } from '@kiltprotocol/did'
import * as CredentialUtils from '../credential/Credential.utils.js'
import * as ClaimUtils from '../claim/Claim.utils.js'
import * as CTypeUtils from '../ctype/CType.utils.js'

// TODO: circular dependency
import { RequestForAttestation } from './RequestForAttestation.js'

/**
 *  Checks whether the input meets all the required criteria of an IRequestForAttestation object.
 *  Throws on invalid input.
 *
 * @param input - A potentially only partial [[IRequestForAttestation]].
 * @throws [[ERROR_CLAIM_NOT_PROVIDED]], [[ERROR_LEGITIMATIONS_NOT_PROVIDED]], [[ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED]] or [[ERROR_DELEGATION_ID_TYPE]] when either the input's claim, legitimations, claimHashTree or DelegationId are not provided or of the wrong type, respectively.
 * @throws [[ERROR_CLAIM_NONCE_MAP_MALFORMED]] when any of the input's claimHashTree's keys missing their hash.
 *
 */
export function errorCheck(input: IRequestForAttestation): void {
  if (!input.claim) {
    throw new SDKErrors.ERROR_CLAIM_NOT_PROVIDED()
  } else {
    ClaimUtils.errorCheck(input.claim)
  }
  if (!input.claim.owner) {
    throw new SDKErrors.ERROR_OWNER_NOT_PROVIDED()
  }
  if (!input.legitimations && !Array.isArray(input.legitimations)) {
    throw new SDKErrors.ERROR_LEGITIMATIONS_NOT_PROVIDED()
  }

  if (!input.claimNonceMap) {
    throw new SDKErrors.ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED()
  }
  if (
    typeof input.claimNonceMap !== 'object' ||
    Object.entries(input.claimNonceMap).some(
      ([digest, nonce]) =>
        !digest ||
        !DataUtils.validateHash(digest, 'statement digest') ||
        typeof nonce !== 'string' ||
        !nonce
    )
  ) {
    throw new SDKErrors.ERROR_CLAIM_NONCE_MAP_MALFORMED()
  }
  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw new SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }
  if (input.claimerSignature) isDidSignature(input.claimerSignature)
  RequestForAttestation.verifyData(input as IRequestForAttestation)
}

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
  errorCheck(reqForAtt)
  return [
    ClaimUtils.compress(reqForAtt.claim),
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
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('Request for Attestation')
  }
  return {
    claim: ClaimUtils.decompress(reqForAtt[0]),
    claimNonceMap: reqForAtt[1],
    claimerSignature: reqForAtt[2],
    claimHashes: reqForAtt[3],
    rootHash: reqForAtt[4],
    legitimations: decompressLegitimation(reqForAtt[5]),
    delegationId: reqForAtt[6],
  }
}

/**
 *  Checks the [[RequestForAttestation]] with a given [[CType]] to check if the claim meets the [[schema]] structure.
 *
 * @param requestForAttestation A [[RequestForAttestation]] object for the attester.
 * @param ctype A [[CType]] to verify the [[Claim]] structure.
 *
 * @returns A boolean if the [[Claim]] structure in the [[RequestForAttestation]] is valid.
 */
export function verifyStructure(
  requestForAttestation: IRequestForAttestation,
  ctype: ICType
): boolean {
  try {
    errorCheck(requestForAttestation)
  } catch {
    return false
  }
  return CTypeUtils.verifyClaimStructure(
    requestForAttestation.claim.contents,
    ctype.schema
  )
}
