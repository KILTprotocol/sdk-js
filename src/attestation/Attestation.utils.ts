import IAttestation, { CompressedAttestation } from '../types/Attestation'

export function errorCheck(attestation: IAttestation): void {
  if (!attestation.cTypeHash || !attestation.claimHash || !attestation.owner) {
    throw new Error(
      `Property Not Provided while building Attestation: ${JSON.stringify(
        attestation,
        null,
        2
      )}`
    )
  }
}
/**
 *  Compresses an [[Attestation]] object into an array for storage and/or messaging.
 *
 * @param attestation An [[Attestation]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of an [[Attestation]].
 */

export function compress(attestation: IAttestation): CompressedAttestation {
  errorCheck(attestation)
  return [
    attestation.claimHash,
    attestation.cTypeHash,
    attestation.owner,
    attestation.revoked,
    attestation.delegationId,
  ]
}

/**
 *  Decompresses an [[Attestation]] from storage and/or message into an object.
 *
 * @param attestation A compressesd [[Attestation]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an [[Attestation]].
 */

export function decompress(attestation: CompressedAttestation): IAttestation {
  if (!Array.isArray(attestation) || attestation.length !== 5) {
    throw new Error(
      'Compressed Attestation isnt an Array or has all the required data types'
    )
  }
  return {
    claimHash: attestation[0],
    cTypeHash: attestation[1],
    owner: attestation[2],
    revoked: attestation[3],
    delegationId: attestation[4],
  }
}

export default {
  decompress,
  compress,
  errorCheck,
}
