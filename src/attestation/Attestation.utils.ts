/**
 * @packageDocumentation
 * @module AttestationUtils
 * @preferred
 */

import IAttestation, { CompressedAttestation } from '../types/Attestation'
import Attestation from './Attestation'

/**
 *  Compresses an [[Attestation]] object into an array for storage and/or messaging.
 *
 * @param attestation An [[Attestation]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of an [[Attestation]].
 */

export function compress(attestation: IAttestation): CompressedAttestation {
  Attestation.isAttestation(attestation)
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
 * @param attestation A compressed [[Attestation]] array that is reverted back into an object.
 * @throws When [[attestation]] is not an Array or it's length is unequal 5.
 *
 * @returns An object that has the same properties as an [[Attestation]].
 */

export function decompress(attestation: CompressedAttestation): IAttestation {
  if (!Array.isArray(attestation) || attestation.length !== 5) {
    throw new Error(
      "Compressed Attestation isn't an Array or has all the required data types"
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
}
