/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module ClaimUtils
 */

import { hexToBn } from '@polkadot/util'
import type {
  IClaim,
  CompressedClaim,
  PartialClaim,
  CompressedPartialClaim,
} from '@kiltprotocol/types'
import { jsonabc, DataUtils, Crypto, SDKErrors } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'
import type { HexString } from '@polkadot/util/types'
import { getIdForCTypeHash } from '../ctype/CType.utils.js'

const VC_VOCAB = 'https://www.w3.org/2018/credentials#'

/**
 * Produces JSON-LD readable representations of [[IClaim]]['contents']. This is done by implicitly or explicitely transforming property keys to globally unique predicates.
 * Where possible these predicates are taken directly from the Verifiable Credentials vocabulary. Properties that are unique to a [[CType]] are transformed to predicates by prepending the [[CType]][schema][$id].
 *
 * @param claim A (partial) [[IClaim]] from to build a JSON-LD representation from. The `cTypeHash` property is required.
 * @param expanded Return an expanded instead of a compacted represenation. While property transformation is done explicitely in the expanded format, it is otherwise done implicitly via adding JSON-LD's reserved `@context` properties while leaving [[IClaim]][contents] property keys untouched.
 * @returns An object which can be serialized into valid JSON-LD representing an [[IClaim]]'s ['contents'].
 * @throws [[ERROR_CTYPE_HASH_NOT_PROVIDED]] in case the claim's ['cTypeHash'] property is undefined.
 */
function jsonLDcontents(
  claim: PartialClaim,
  expanded = true
): Record<string, unknown> {
  const { cTypeHash, contents, owner } = claim
  if (!cTypeHash) SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
  const vocabulary = `${getIdForCTypeHash(cTypeHash)}#`
  const result: Record<string, unknown> = {}
  if (owner) result['@id'] = owner
  if (!expanded) {
    return {
      ...result,
      '@context': { '@vocab': vocabulary },
      ...contents,
    }
  }
  Object.entries(contents || {}).forEach(([key, value]) => {
    result[vocabulary + key] = value
  })
  return result
}

/**
 * Produces JSON-LD readable representations of KILT claims. This is done by implicitly or explicitely transforming property keys to globally unique predicates.
 * Where possible these predicates are taken directly from the Verifiable Credentials vocabulary. Properties that are unique to a [[CType]] are transformed to predicates by prepending the [[CType]][schema][$id].
 *
 * @param claim A (partial) [[IClaim]] from to build a JSON-LD representation from. The `cTypeHash` property is required.
 * @param expanded Return an expanded instead of a compacted represenation. While property transformation is done explicitely in the expanded format, it is otherwise done implicitly via adding JSON-LD's reserved `@context` properties while leaving [[IClaim]][contents] property keys untouched.
 * @returns An object which can be serialized into valid JSON-LD representing an [[IClaim]].
 * @throws [[ERROR_CTYPE_HASH_NOT_PROVIDED]] in case the claim's ['cTypeHash'] property is undefined.
 */
export function toJsonLD(
  claim: PartialClaim,
  expanded = true
): Record<string, unknown> {
  const credentialSubject = jsonLDcontents(claim, expanded)
  const prefix = expanded ? VC_VOCAB : ''
  const result = {
    [`${prefix}credentialSubject`]: credentialSubject,
  }
  result[`${prefix}credentialSchema`] = {
    '@id': getIdForCTypeHash(claim.cTypeHash),
  }
  if (!expanded) result['@context'] = { '@vocab': VC_VOCAB }
  return result
}

function makeStatementsJsonLD(claim: PartialClaim): string[] {
  const normalized = jsonLDcontents(claim, true)
  return Object.entries(normalized).map(([key, value]) =>
    JSON.stringify({ [key]: value })
  )
}

/**
 * Produces salted hashes of individual statements comprising a (partial) [[IClaim]] to enable selective disclosure of contents. Can also be used to reproduce hashes for the purpose of validation.
 *
 * @param claim Full or partial [[IClaim]] to produce statement hashes from.
 * @param options Object containing optional parameters.
 * @param options.canonicalisation Canonicalisation routine that produces an array of statement strings from the [IClaim]. Default produces individual `{"key":"value"}` JSON representations where keys are transformed to expanded JSON-LD.
 * @param options.nonces Optional map of nonces as produced by this function.
 * @param options.nonceGenerator Nonce generator as defined by [[hashStatements]] to be used if no `nonces` are given. Default produces random UUIDs (v4).
 * @param options.hasher The hasher to be used. Required but defaults to 256 bit blake2 over `${nonce}${statement}`.
 * @returns An array of salted `hashes` and a `nonceMap` where keys correspond to unsalted statement hashes.
 * @throws [[ERROR_CLAIM_NONCE_MAP_MALFORMED]] if the nonceMap or the nonceGenerator was non-exhaustive for any statement.
 */
export function hashClaimContents(
  claim: PartialClaim,
  options: Crypto.HashingOptions & {
    canonicalisation?: (claim: PartialClaim) => string[]
  } = {}
): {
  hashes: HexString[]
  nonceMap: Record<string, string>
} {
  // apply defaults
  const defaults = { canonicalisation: makeStatementsJsonLD }
  const canonicalisation = options.canonicalisation || defaults.canonicalisation
  // use canonicalisation algorithm to make hashable statement strings
  const statements = canonicalisation(claim)
  // iterate over statements to produce salted hashes
  const processed = Crypto.hashStatements(statements, options)
  // produce array of salted hashes to add to credential
  const hashes = processed
    .map(({ saltedHash }) => saltedHash)
    .sort((a, b) => hexToBn(a).cmp(hexToBn(b)))
  // produce nonce map, where each nonce is keyed with the unsalted hash
  const nonceMap = {}
  processed.forEach(({ digest, nonce, statement }) => {
    // throw if we can't map a digest to a nonce - this should not happen if the nonce map is complete and the credential has not been tampered with
    if (!nonce) throw SDKErrors.ERROR_CLAIM_NONCE_MAP_MALFORMED(statement)
    nonceMap[digest] = nonce
  }, {})
  return { hashes, nonceMap }
}

/**
 * Used to verify the hash list based proof over the set of disclosed attributes in a [[Claim]].
 *
 * @param claim Full or partial [[IClaim]] to verify proof against.
 * @param proof Proof consisting of a map that matches nonces to statement digests and the resulting hashes.
 * @param proof.nonces A map where a statement digest as produces by options.hasher is mapped to a nonce.
 * @param proof.hashes Array containing hashes which are signed into the credential. Should result from feeding statement digests and nonces in proof.nonce to options.hasher.
 * @param options Object containing optional parameters.
 * @param options.canonicalisation Canonicalisation routine that produces an array of statement strings from the [IClaim]. Default produces individual `{"key":"value"}` JSON representations where keys are transformed to expanded JSON-LD.
 * @param options.hasher The hasher to be used. Required but defaults to 256 bit blake2 over `${nonce}${statement}`.
 * @returns `verified` is a boolean indicating whether the proof is valid. `errors` is an array of all errors in case it is not.
 */
export function verifyDisclosedAttributes(
  claim: PartialClaim,
  proof: {
    nonces: Record<string, string>
    hashes: string[]
  },
  options: Pick<Crypto.HashingOptions, 'hasher'> & {
    canonicalisation?: (claim: PartialClaim) => string[]
  } = {}
): { verified: boolean; errors: SDKErrors.SDKError[] } {
  // apply defaults
  const defaults = { canonicalisation: makeStatementsJsonLD }
  const canonicalisation = options.canonicalisation || defaults.canonicalisation
  const { nonces } = proof
  // use canonicalisation algorithm to make hashable statement strings
  const statements = canonicalisation(claim)
  // iterate over statements to produce salted hashes
  const hashed = Crypto.hashStatements(statements, { ...options, nonces })
  // check resulting hashes
  const digestsInProof = Object.keys(nonces)
  return hashed.reduce<{ verified: boolean; errors: SDKErrors.SDKError[] }>(
    (status, { saltedHash, statement, digest, nonce }) => {
      // check if the statement digest was contained in the proof and mapped it to a nonce
      if (!digestsInProof.includes(digest) || !nonce) {
        status.errors.push(SDKErrors.ERROR_NO_PROOF_FOR_STATEMENT(statement))
        return { ...status, verified: false }
      }
      // check if the hash is whitelisted in the proof
      if (!proof.hashes.includes(saltedHash)) {
        status.errors.push(
          SDKErrors.ERROR_INVALID_PROOF_FOR_STATEMENT(statement)
        )
        return { ...status, verified: false }
      }
      return status
    },
    { verified: true, errors: [] }
  )
}

/**
 *  Checks whether the input meets all the required criteria of an [[IClaim]] object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial IClaim.
 * @throws [[ERROR_CTYPE_HASH_NOT_PROVIDED]] when input's cTypeHash do not exist.
 * @throws [[ERROR_CLAIM_CONTENTS_MALFORMED]] when any of the input's contents[key] is not of type 'number', 'boolean' or 'string'.
 *
 */
export function errorCheck(input: IClaim | PartialClaim): void {
  if (!input.cTypeHash) {
    throw SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
  }
  if (input.owner) {
    DidUtils.validateKiltDidUri(input.owner)
  }
  if (input.contents !== undefined) {
    Object.entries(input.contents).forEach(([key, value]) => {
      if (
        !key ||
        typeof key !== 'string' ||
        !['string', 'number', 'boolean', 'object'].includes(typeof value)
      ) {
        throw SDKErrors.ERROR_CLAIM_CONTENTS_MALFORMED()
      }
    })
  }
  DataUtils.validateHash(input.cTypeHash, 'Claim CType')
}

/**
 *  Compresses the [[IClaim]] for storage and/or messaging.
 *
 * @param claim An [[IClaim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CompressedClaim]].
 */
export function compress(claim: IClaim): CompressedClaim
/**
 *  Compresses the [[PartialClaim]] for storage and/or messaging.
 *
 * @param claim A [[PartialClaim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CompressedPartialClaim]].
 */
export function compress(claim: PartialClaim): CompressedPartialClaim
export function compress(
  claim: IClaim | PartialClaim
): CompressedClaim | CompressedPartialClaim {
  errorCheck(claim)
  let sortedContents
  if (claim.contents) {
    sortedContents = jsonabc.sortObj(claim.contents)
  }
  return [claim.cTypeHash, claim.owner, sortedContents]
}

/**
 *  Decompresses the [[IClaim]] from storage and/or message.
 *
 * @param claim A [[CompressedClaim]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when a [[CompressedClaim]] is not an Array or it's length is unequal 3.
 * @returns An [[IClaim]] object that has the same properties as the [[CompressedClaim]].
 */
export function decompress(claim: CompressedClaim): IClaim
/**
 *  Decompresses the Partial [[IClaim]] from storage and/or message.
 *
 * @param claim A [[CompressedPartialClaim]] array that is reverted back into an object.
 * @throws When a [[CompressedPartialClaim]] is not an Array or it's length is unequal 3.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]].
 * @returns A [[PartialClaim]] object that has the same properties as the [[CompressedPartialClaim]].
 */
export function decompress(claim: CompressedPartialClaim): PartialClaim
export function decompress(
  claim: CompressedClaim | CompressedPartialClaim
): IClaim | PartialClaim {
  if (!Array.isArray(claim) || claim.length !== 3) {
    throw SDKErrors.ERROR_DECOMPRESSION_ARRAY('Claim')
  }
  return {
    cTypeHash: claim[0],
    owner: claim[1],
    contents: claim[2],
  }
}
