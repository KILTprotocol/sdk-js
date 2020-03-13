import * as jsonabc from 'jsonabc'

import ClaimUtils from '../claim/Claim.util'
import AttestedClaimUtils from '../attestedclaim/AttestedClaim.util'
import IAttestedClaim, { CompressedAttestedClaim } from '../types/AttestedClaim'
import IRequestForAttestation, {
  NonceHash,
  CompressedNonceHash,
  ClaimHashTree,
  CompressedClaimHashTree,
  CompressedRequestForAttestation,
} from '../types/RequestForAttestation'

export function requestForAttestationErrorCheck(
  requestForAttestation: IRequestForAttestation
): void {
  if (
    !requestForAttestation.claim ||
    !requestForAttestation.legitimations ||
    !requestForAttestation.claimOwner ||
    !requestForAttestation.claimerSignature ||
    !requestForAttestation.claimHashTree ||
    !requestForAttestation.cTypeHash ||
    !requestForAttestation.rootHash
  ) {
    throw new Error(
      `Property Not Provided while building RequestForAttestation: ${JSON.stringify(
        requestForAttestation,
        null,
        2
      )}`
    )
  }
}

/**
 *  Compresses an nonce and hash from a [[ClaimHashTree]] or [[RequestForAttestation]] properties.
 *
 * @param nonceHash A hash or a hash and nonce object that will be sorted and stripped for messaging or storage.
 *
 * @returns An object compressing of a hash or a hash and nonce.
 */

export function compressNonceAndHash(
  nonceHash: NonceHash
): CompressedNonceHash {
  if (!nonceHash.nonce || !nonceHash.hash) {
    throw new Error(
      `Property Not Provided while building RequestForAttestation: ${JSON.stringify(
        nonceHash,
        null,
        2
      )}`
    )
  }
  return [nonceHash.hash, nonceHash.nonce]
}

/**
 *  Decompresses an nonce and hash from a [[ClaimHashTree]] or [[RequestForAttestation]] properties.
 *
 * @param nonceHash A compressesd a hash or a hash and nonce array that is reverted back into an object.
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
 *  Compresses a [[claimHashTree]] within a [[RequestForAttestation]] object.
 *
 * @param reqForAtt A [[claimHashTree]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of an [[claimHashTree]].
 */

export function compressClaimHashTree(
  claimHashTree: ClaimHashTree
): CompressedClaimHashTree {
  const sortedClaimHashTree = jsonabc.sortObj(claimHashTree)
  const result = {}

  Object.keys(sortedClaimHashTree).forEach(entryKey => {
    result[entryKey] = compressNonceAndHash(sortedClaimHashTree[entryKey])
  })
  return result
}

/**
 *  Decompresses a claim hash tree from storage and/or message.
 *
 * @param reqForAtt A compressesd claim hash tree array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an claim hash tree.
 */

export function decompressClaimHashTree(
  compressedClaimHashTree: CompressedClaimHashTree
): ClaimHashTree {
  const result = {}

  Object.keys(compressedClaimHashTree).forEach(entryKey => {
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
  return leg.map(AttestedClaimUtils.compressAttestedClaim)
}

/**
 *  Decompresses [[AttestedClaim]]s which are an [[Attestation]] and [[RequestForAttestation]] from storage and/or message.
 *
 * @param leg A compressesd [[Attestation]] and [[RequestForAttestation]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an [[AttestedClaim]].
 */

function decompressLegitimation(
  leg: CompressedAttestedClaim[]
): IAttestedClaim[] {
  return leg.map(AttestedClaimUtils.decompressAttestedClaim)
}

/**
 *  Compresses a [[RequestForAttestation]] for storage and/or messaging.
 *
 * @param reqForAtt A [[RequestForAttestation]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[RequestForAttestation]].
 */

export function compressRequestForAttestation(
  reqForAtt: IRequestForAttestation
): CompressedRequestForAttestation {
  requestForAttestationErrorCheck(reqForAtt)
  return [
    ClaimUtils.compressClaim(reqForAtt.claim),
    compressClaimHashTree(reqForAtt.claimHashTree),
    compressNonceAndHash(reqForAtt.claimOwner),
    reqForAtt.claimerSignature,
    compressNonceAndHash(reqForAtt.cTypeHash),
    reqForAtt.rootHash,
    compressLegitimation(reqForAtt.legitimations),
    reqForAtt.delegationId,
  ]
}

/**
 *  Decompresses a [[RequestForAttestation]] from storage and/or message.
 *
 * @param reqForAtt A compressesd [[RequestForAttestation]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[RequestForAttestation]].
 */

export function decompressRequestForAttestation(
  reqForAtt: CompressedRequestForAttestation
): IRequestForAttestation {
  if (!Array.isArray(reqForAtt) || reqForAtt.length !== 8) {
    throw new Error(
      'Compressed Request For Attestation isnt an Array or has all the required data types'
    )
  }
  return {
    claim: ClaimUtils.decompressClaim(reqForAtt[0]),
    claimHashTree: decompressClaimHashTree(reqForAtt[1]),
    claimOwner: decompressNonceAndHash(reqForAtt[2]),
    claimerSignature: reqForAtt[3],
    cTypeHash: decompressNonceAndHash(reqForAtt[4]),
    rootHash: reqForAtt[5],
    legitimations: decompressLegitimation(reqForAtt[6]),
    delegationId: reqForAtt[7],
  }
}

export default {
  requestForAttestationErrorCheck,
  decompressRequestForAttestation,
  decompressNonceAndHash,
  decompressLegitimation,
  decompressClaimHashTree,
  compressRequestForAttestation,
  compressClaimHashTree,
  compressLegitimation,
  compressNonceAndHash,
}
