/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module AttestedClaimUtils
 */

import type {
  IAttestedClaim,
  CompressedAttestedClaim,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import * as AttestationUtils from '../attestation/Attestation.utils'
import * as RequestForAttestationUtils from '../requestforattestation/RequestForAttestation.utils'
import { AttestedClaim } from './AttestedClaim'

/**
 *  Checks whether the input meets all the required criteria of an IAttestedClaim object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial IAttestedClaim.
 * @throws [[ERROR_ATTESTATION_NOT_PROVIDED]] or [[ERROR_RFA_NOT_PROVIDED]] when input's attestation and request respectively do not exist.
 * @throws [[ERROR_ATTESTEDCLAIM_UNVERIFIABLE]] when input's data could not be verified.
 *
 */
export function errorCheck(input: IAttestedClaim): void {
  if (input.attestation) {
    AttestationUtils.errorCheck(input.attestation)
  } else throw SDKErrors.ERROR_ATTESTATION_NOT_PROVIDED()

  if (input.request) {
    RequestForAttestationUtils.errorCheck(input.request)
  } else throw SDKErrors.ERROR_RFA_NOT_PROVIDED()

  if (!AttestedClaim.verifyData(input as IAttestedClaim)) {
    throw SDKErrors.ERROR_ATTESTEDCLAIM_UNVERIFIABLE()
  }
}

/**
 *  Compresses an [[AttestedClaim]] object into an array for storage and/or messaging.
 *
 * @param attestedClaim An [[AttestedClaim]] that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of an [[AttestedClaim]] that comprises of an [[Attestation]] and [[RequestForAttestation]] arrays.
 */

export function compress(
  attestedClaim: IAttestedClaim
): CompressedAttestedClaim {
  errorCheck(attestedClaim)

  return [
    RequestForAttestationUtils.compress(attestedClaim.request),
    AttestationUtils.compress(attestedClaim.attestation),
  ]
}

/**
 *  Decompresses an [[AttestedClaim]] array from storage and/or message into an object.
 *
 * @param attestedClaim A compressed [[Attestation]] and [[RequestForAttestation]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when attestedClaim is not an Array or it's length is unequal 2.
 *
 * @returns An object that has the same properties as an [[AttestedClaim]].
 */

export function decompress(
  attestedClaim: CompressedAttestedClaim
): IAttestedClaim {
  if (!Array.isArray(attestedClaim) || attestedClaim.length !== 2) {
    throw SDKErrors.ERROR_DECOMPRESSION_ARRAY('Attested Claim')
  }
  return {
    request: RequestForAttestationUtils.decompress(attestedClaim[0]),
    attestation: AttestationUtils.decompress(attestedClaim[1]),
  }
}
