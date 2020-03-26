/**
 * @packageDocumentation
 * @module AttestedClaimUtils
 * @preferred
 */

import AttestationUtils from '../attestation/Attestation.utils'
import IAttestedClaim, { CompressedAttestedClaim } from '../types/AttestedClaim'
import RequestForAttestationUtils from '../requestforattestation/RequestForAttestation.utils'

export function errorCheck(attestedClaim: IAttestedClaim): void {
  if (!attestedClaim.request || !attestedClaim.attestation) {
    throw new Error(
      `Property Not Provided while building AttestedClaim: ${JSON.stringify(
        attestedClaim,
        null,
        2
      )}`
    )
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
 *
 * @returns An object that has the same properties as an [[AttestedClaim]].
 */

export function decompress(
  attestedClaim: CompressedAttestedClaim
): IAttestedClaim {
  if (!Array.isArray(attestedClaim) || attestedClaim.length !== 2) {
    throw new Error(
      "Compressed Attested Claim isn't an Array or has all the required data types"
    )
  }
  return {
    request: RequestForAttestationUtils.decompress(attestedClaim[0]),
    attestation: AttestationUtils.decompress(attestedClaim[1]),
  }
}

export default {
  decompress,
  compress,
  errorCheck,
}
