import AttestationUtils from '../attestation/Attestation.utils'
import IAttestedClaim, { CompressedAttestedClaim } from '../types/AttestedClaim'
import RequestForAttestationUtils from '../requestforattestation/RequestForAttestation.utils'

export function attestedClaimErrorCheck(attestedClaim: IAttestedClaim): void {
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

export function compressAttestedClaim(
  attestedClaim: IAttestedClaim
): CompressedAttestedClaim {
  attestedClaimErrorCheck(attestedClaim)

  return [
    RequestForAttestationUtils.compressRequestForAttestation(
      attestedClaim.request
    ),
    AttestationUtils.compressAttestation(attestedClaim.attestation),
  ]
}

/**
 *  Decompresses an [[AttestedClaim]] array from storage and/or message into an object.
 *
 * @param attestedClaim A compressesd [[Attestation]] and [[RequestForAttestation]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an [[AttestedClaim]].
 */

export function decompressAttestedClaim(
  attestedClaim: CompressedAttestedClaim
): IAttestedClaim {
  if (!Array.isArray(attestedClaim) || attestedClaim.length !== 2) {
    throw new Error(
      'Compressed Attested Claim isnt an Array or has all the required data types'
    )
  }
  return {
    request: RequestForAttestationUtils.decompressRequestForAttestation(
      attestedClaim[0]
    ),
    attestation: AttestationUtils.decompressAttestation(attestedClaim[1]),
  }
}

export default {
  decompressAttestedClaim,
  compressAttestedClaim,
  attestedClaimErrorCheck,
}
