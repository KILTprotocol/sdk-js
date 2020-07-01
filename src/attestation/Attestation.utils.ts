/**
 * @packageDocumentation
 * @module AttestationUtils
 * @preferred
 */

import * as SDKErrors from '../errorhandling/SDKErrors'
import IAttestation, { CompressedAttestation } from '../types/Attestation'
import { validateAddress, validateHash } from '../util/DataUtils'

/**
 *  Checks whether the input meets all the required criteria of an IAttestation object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial IAttestation.
 * @throws When input's cTypeHash, claimHash and owner do not exist.
 * @throws When the input's delegationId is not of type 'string' or 'null'.
 * @throws When input.revoked is not of type 'boolean'.
 * @throws [[ERROR_CTYPE_HASH_NOT_PROVIDED]], [[ERROR_CLAIM_HASH_NOT_PROVIDED]], [[ERROR_DELEGATION_ID_TYPE]], [[ERROR_OWNER_NOT_PROVIDED]], [[ERROR_REVOCATION_BIT_MISSING]].
 *
 */
export function errorCheck(input: IAttestation): void {
  if (!input.cTypeHash) {
    throw SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
  } else validateHash(input.cTypeHash, 'CType')

  if (!input.claimHash) {
    throw SDKErrors.ERROR_CLAIM_HASH_NOT_PROVIDED()
  } else validateHash(input.claimHash, 'Claim')

  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }
  if (!input.owner) {
    throw SDKErrors.ERROR_OWNER_NOT_PROVIDED()
  } else validateAddress(input.owner, 'owner')

  if (typeof input.revoked !== 'boolean') {
    throw SDKErrors.ERROR_REVOCATION_BIT_MISSING()
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
 * @throws [[ERROR_DECOMPRESSION_ARRAY]].
 *
 * @returns An object that has the same properties as an [[Attestation]].
 */

export function decompress(attestation: CompressedAttestation): IAttestation {
  if (!Array.isArray(attestation) || attestation.length !== 5) {
    throw SDKErrors.ERROR_DECOMPRESSION_ARRAY('Attestation')
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
