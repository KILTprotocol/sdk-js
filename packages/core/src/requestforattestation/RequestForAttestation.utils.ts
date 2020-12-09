/**
 * @packageDocumentation
 * @module RequestForAttestationUtils
 * @preferred
 */

import jsonabc from '../util/jsonabc'
import AttestedClaimUtils from '../attestedclaim/AttestedClaim.utils'
import ClaimUtils from '../claim/Claim.utils'
import * as SDKErrors from '../errorhandling/SDKErrors'
import IAttestedClaim, { CompressedAttestedClaim } from '../types/AttestedClaim'
import IRequestForAttestation, {
  CompressedNonceHash,
  CompressedNonceHashTree,
  CompressedRequestForAttestation,
  NonceHash,
  NonceHashTree,
} from '../types/RequestForAttestation'
import RequestForAttestation from './RequestForAttestation'

/**
 *  Checks whether the input meets all the required criteria of an IRequestForAttestation object.
 *  Throws on invalid input.
 *
 * @param input - A potentially only partial [[IRequestForAttestation]].
 * @throws When either the input's claim, legitimations, claimHashTree or DelegationId are not provided or of the wrong type.
 * @throws When any of the input's claimHashTree's keys missing their hash.
 * @throws [[ERROR_CLAIM_NOT_PROVIDED]], [[ERROR_LEGITIMATIONS_NOT_PROVIDED]], [[ERROR_CLAIM_HASHTREE_NOT_PROVIDED]], [[ERROR_CLAIM_HASHTREE_MALFORMED]], [[ERROR_DELEGATION_ID_TYPE]].
 *
 */
export function errorCheck(input: IRequestForAttestation): void {
  if (!input.claim) {
    throw SDKErrors.ERROR_CLAIM_NOT_PROVIDED()
  } else {
    ClaimUtils.errorCheck(input.claim)
  }
  if (!input.legitimations && !Array.isArray(input.legitimations)) {
    throw SDKErrors.ERROR_LEGITIMATIONS_NOT_PROVIDED()
  }

  if (!input.claimHashTree) {
    throw SDKErrors.ERROR_CLAIM_HASHTREE_NOT_PROVIDED()
  } else {
    Object.keys(input.claimHashTree).forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (!input.claimHashTree![key].hash) {
        throw SDKErrors.ERROR_CLAIM_HASHTREE_MALFORMED()
      }
    })
  }
  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw SDKErrors.ERROR_DELEGATION_ID_TYPE
  }
  RequestForAttestation.verifyData(input as IRequestForAttestation)
}

/**
 *  Compresses an nonce and hash from a [[NonceHashTree]] or [[RequestForAttestation]] properties.
 *
 * @param nonceHash A hash or a hash and nonce object that will be sorted and stripped for messaging or storage.
 * @throws When the nonceHash is missing it's hash (existence of nonce is ignored).
 * @throws [[ERROR_COMPRESS_OBJECT]].
 *
 * @returns An object compressing of a hash or a hash and nonce.
 */

export function compressNonceAndHash(
  nonceHash: NonceHash
): CompressedNonceHash {
  if (!nonceHash.hash) {
    throw SDKErrors.ERROR_COMPRESS_OBJECT(nonceHash, 'Nonce Hash')
  }
  return [nonceHash.hash, nonceHash.nonce]
}

/**
 *  Decompresses an nonce and hash from a [[NonceHashTree]] or [[RequestForAttestation]] properties.
 *
 * @param nonceHash A compressed a hash or a hash and nonce array that is reverted back into an object.
 *
 * @returns An object compressing of a hash or a hash and nonce.
 */

function decompressNonceAndHash(nonceHash: CompressedNonceHash): NonceHash {
  if (nonceHash.length === 1) {
    return {
      hash: nonceHash[0],
    }
  }
  return {
    hash: nonceHash[0],
    nonce: nonceHash[1],
  }
}

/**
 *  Compresses a [[NonceHashTree]] within a [[RequestForAttestation]] object.
 *
 * @param reqForAtt A [[NonceHashTree]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of an [[NonceHashTree]].
 */

export function compressClaimHashTree(
  claimHashTree: NonceHashTree
): CompressedNonceHashTree {
  const sortedClaimHashTree = jsonabc.sortObj(claimHashTree)
  const result = {}

  Object.keys(sortedClaimHashTree).forEach((entryKey) => {
    result[entryKey] = compressNonceAndHash(sortedClaimHashTree[entryKey])
  })
  return result
}

/**
 *  Decompresses a claim hash tree from storage and/or message.
 *
 * @param reqForAtt A compressed claim hash tree array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an claim hash tree.
 */

export function decompressClaimHashTree(
  compressedClaimHashTree: CompressedNonceHashTree
): NonceHashTree {
  const result = {}

  Object.keys(compressedClaimHashTree).forEach((entryKey) => {
    result[entryKey] = decompressNonceAndHash(compressedClaimHashTree[entryKey])
  })
  return result
}

/**
 *  Compresses [[AttestedClaim]]s which are made up from an [[Attestation]] and [[RequestForAttestation]] for storage and/or message.
 *
 * @param leg An array of [[Attestation]] and [[RequestForAttestation]] objects.
 *
 * @returns An ordered array of [[AttestedClaim]]s.
 */

export function compressLegitimation(
  leg: IAttestedClaim[]
): CompressedAttestedClaim[] {
  return leg.map(AttestedClaimUtils.compress)
}

/**
 *  Decompresses [[AttestedClaim]]s which are an [[Attestation]] and [[RequestForAttestation]] from storage and/or message.
 *
 * @param leg A compressed [[Attestation]] and [[RequestForAttestation]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an [[AttestedClaim]].
 */

function decompressLegitimation(
  leg: CompressedAttestedClaim[]
): IAttestedClaim[] {
  return leg.map(AttestedClaimUtils.decompress)
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
    compressClaimHashTree(reqForAtt.claimHashTree),
    compressNonceAndHash(reqForAtt.claimOwner),
    reqForAtt.claimerSignature,
    compressNonceAndHash(reqForAtt.cTypeHash),
    reqForAtt.rootHash,
    compressLegitimation(reqForAtt.legitimations),
    reqForAtt.delegationId,
    reqForAtt.privacyEnhancement,
  ]
}

/**
 *  Decompresses a [[RequestForAttestation]] from storage and/or message.
 *
 * @param reqForAtt A compressed [[RequestForAttestation]] array that is reverted back into an object.
 * @throws When reqForAtt is not an Array and it's length is not equal to the defined length of 8.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]].
 *
 * @returns An object that has the same properties as a [[RequestForAttestation]].
 */

export function decompress(
  reqForAtt: CompressedRequestForAttestation
): IRequestForAttestation {
  if (!Array.isArray(reqForAtt) || reqForAtt.length !== 9) {
    throw SDKErrors.ERROR_DECOMPRESSION_ARRAY('Request for Attestation')
  }
  return {
    claim: ClaimUtils.decompress(reqForAtt[0]),
    claimHashTree: decompressClaimHashTree(reqForAtt[1]),
    claimOwner: decompressNonceAndHash(reqForAtt[2]),
    claimerSignature: reqForAtt[3],
    cTypeHash: decompressNonceAndHash(reqForAtt[4]),
    rootHash: reqForAtt[5],
    legitimations: decompressLegitimation(reqForAtt[6]),
    delegationId: reqForAtt[7],
    privacyEnhancement: reqForAtt[8],
  }
}

export default {
  errorCheck,
  decompress,
  decompressNonceAndHash,
  decompressLegitimation,
  decompressClaimHashTree,
  compress,
  compressClaimHashTree,
  compressLegitimation,
  compressNonceAndHash,
}
