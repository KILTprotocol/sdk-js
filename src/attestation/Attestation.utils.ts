/**
 * @packageDocumentation
 * @module AttestationUtils
 * @preferred
 */

import IAttestation, { CompressedAttestation } from '../types/Attestation'
import { validateHash, validateAddress } from '../util/DataUtils'

/**
 *  Checks whether the input meets all the required criteria of an IAttestation object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial IAttestation.
 * @throws When input's cTypeHash, claimHash and owner do not exist.
 * @throws When the input's delegationId is not of type 'string' or 'null'.
 * @throws When input.revoked is not of type 'boolean'.
 *
 */
export function errorCheck(input: IAttestation): void {
  if (!input.cTypeHash) {
    throw new Error('CType Hash not provided')
  } else validateHash(input.cTypeHash, 'CType')

  if (!input.claimHash) {
    throw new Error('Claim Hash not provided')
  } else validateHash(input.claimHash, 'Claim')

  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw new Error(`Not a valid DelegationId: ${typeof input.delegationId}`)
  }
  if (!input.owner) {
    throw new Error('Owner not provided')
  } else validateAddress(input.owner, 'Owner')

  if (typeof input.revoked !== 'boolean') {
    throw new Error('revocation bit not provided')
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
  errorCheck,
}
