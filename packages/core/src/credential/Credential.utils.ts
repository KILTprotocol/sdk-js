/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  ICredential,
  CompressedCredential,
  ICType,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import * as AttestationUtils from '../attestation/Attestation.utils.js'
import * as CTypeUtils from '../ctype/CType.utils.js'
import * as RequestForAttestationUtils from '../requestforattestation/RequestForAttestation.utils.js'
import { Credential } from './Credential.js'

/**
 *  Checks whether the input meets all the required criteria of an ICredential object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial ICredential.
 * @throws [[ERROR_ATTESTATION_NOT_PROVIDED]] or [[ERROR_RFA_NOT_PROVIDED]] when input's attestation and request respectively do not exist.
 * @throws [[ERROR_CREDENTIAL_UNVERIFIABLE]] when input's data could not be verified.
 *
 */
export function errorCheck(input: ICredential): void {
  if (input.attestation) {
    AttestationUtils.errorCheck(input.attestation)
  } else throw new SDKErrors.ERROR_ATTESTATION_NOT_PROVIDED()

  if (input.request) {
    RequestForAttestationUtils.errorCheck(input.request)
  } else throw new SDKErrors.ERROR_RFA_NOT_PROVIDED()

  if (!Credential.verifyData(input as ICredential)) {
    throw new SDKErrors.ERROR_CREDENTIAL_UNVERIFIABLE()
  }
}

/**
 *  Compresses a [[Credential]] object into an array for storage and/or messaging.
 *
 * @param credential A [[Credential]] that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[Credential]] that comprises of an [[Attestation]] and [[RequestForAttestation]] arrays.
 */
export function compress(credential: ICredential): CompressedCredential {
  errorCheck(credential)

  return [
    RequestForAttestationUtils.compress(credential.request),
    AttestationUtils.compress(credential.attestation),
  ]
}

/**
 *  Decompresses a [[Credential]] array from storage and/or message into an object.
 *
 * @param credential A compressed [[Attestation]] and [[RequestForAttestation]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when credential is not an Array or it's length is unequal 2.
 *
 * @returns An object that has the same properties as a [[Credential]].
 */
export function decompress(credential: CompressedCredential): ICredential {
  if (!Array.isArray(credential) || credential.length !== 2) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('Credential')
  }
  return {
    request: RequestForAttestationUtils.decompress(credential[0]),
    attestation: AttestationUtils.decompress(credential[1]),
  }
}

/**
 *  Checks the [[Credential]] with a given [[CType]] to check if the claim meets the [[schema]] structure.
 *
 * @param credential A [[Credential]] object of an attested claim used for verification.
 * @param ctype A [[CType]] to verify the [[Claim]] structure.
 *
 * @returns A boolean if the [[Claim]] structure in the [[Credential]] is valid.
 */
export function verifyStructure(
  credential: ICredential,
  ctype: ICType
): boolean {
  errorCheck(credential)
  return CTypeUtils.verifyClaimStructure(
    credential.request.claim.contents,
    ctype.schema
  )
}
