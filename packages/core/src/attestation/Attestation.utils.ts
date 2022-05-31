/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IAttestation, CompressedAttestation } from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'

/**
 *  Checks whether the input meets all the required criteria of an [[IAttestation]] object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial [[IAttestation]].
 * @throws [[ERROR_CTYPE_HASH_NOT_PROVIDED]], [[ERROR_CLAIM_HASH_NOT_PROVIDED]] or [[ERROR_OWNER_NOT_PROVIDED]] when input's cTypeHash, claimHash or owner respectively do not exist.
 * @throws [[ERROR_DELEGATION_ID_TYPE]] when the input's delegationId is not of type 'string' or 'null'.
 * @throws [[ERROR_REVOCATION_BIT_MISSING]] when input.revoked is not of type 'boolean'.
 *
 */
export function errorCheck(input: IAttestation): void {
  if (!input.cTypeHash) {
    throw new SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
  } else DataUtils.validateHash(input.cTypeHash, 'CType')

  if (!input.claimHash) {
    throw new SDKErrors.ERROR_CLAIM_HASH_NOT_PROVIDED()
  } else DataUtils.validateHash(input.claimHash, 'Claim')

  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw new SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }
  if (!input.owner) {
    throw new SDKErrors.ERROR_OWNER_NOT_PROVIDED()
  } else DidUtils.validateKiltDidUri(input.owner)

  if (typeof input.revoked !== 'boolean') {
    throw new SDKErrors.ERROR_REVOCATION_BIT_MISSING()
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
 * @param attestation A compressed [[Attestation]] array that is decompressed back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when the attestation is not an array or its length is not equal to 5.
 *
 * @returns An object that has the same properties as an [[Attestation]].
 */
export function decompress(attestation: CompressedAttestation): IAttestation {
  if (!Array.isArray(attestation) || attestation.length !== 5) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('Attestation')
  }
  return {
    claimHash: attestation[0],
    cTypeHash: attestation[1],
    owner: attestation[2],
    revoked: attestation[3],
    delegationId: attestation[4],
  }
}
