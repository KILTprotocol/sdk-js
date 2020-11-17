/**
 * @packageDocumentation
 * @module ClaimUtils
 * @preferred
 */

import { AnyJson } from '@polkadot/types/types'
import { v4 as uuid } from 'uuid'
import { hexToBn } from '@polkadot/util'
import jsonabc from '../util/jsonabc'
import * as SDKErrors from '../errorhandling/SDKErrors'
import IClaim, { CompressedClaim } from '../types/Claim'
import { validateAddress, validateHash } from '../util/DataUtils'
import { getIdForCTypeHash } from '../ctype/CType.utils'
import { HashingOptions, hashStatements } from '../crypto/Crypto'

const VC_VOCAB = 'https://www.w3.org/2018/credentials#'

/**
 * The minimal partial claim from which a JSON-LD representation can be built.
 */
export type PartialClaim = Partial<IClaim> & Pick<IClaim, 'cTypeHash'>

function JsonLDcontents(
  claim: PartialClaim,
  expanded = true
): Record<string, AnyJson> {
  const { cTypeHash, contents, owner } = claim
  if (!cTypeHash)
    throw new Error('ctype hash is required for conversion to json-ld')
  const vocabulary = `${getIdForCTypeHash(claim.cTypeHash)}#`
  const result: Record<string, any> = {}
  if (claim.owner) result['@id'] = owner
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
 * @param expanded Return an expaned instead of a compacted represenation. While property transformation is done explicitely in the expanded format, it is otherwise done implicitly via adding JSON-LD's reserved `@context` properties while leaving [[IClaim]][contents] property keys untouched.
 * @returns An object which can be serialized into valid JSON-LD representing an [[IClaim]].
 */
export function toJsonLD(
  claim: PartialClaim,
  expanded = true
): Record<string, AnyJson> {
  const credentialSubject = JsonLDcontents(claim, expanded)
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
  const normalized = JsonLDcontents(claim, true)
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
 */
export function hashClaimContents(
  claim: PartialClaim,
  options: HashingOptions & {
    canonicalisation?: (claim: PartialClaim) => string[]
  } = {}
): { hashes: string[]; nonceMap: Record<string, string> } {
  // apply defaults
  const defaults = {
    nonceGenerator: () => uuid(),
    canonicalisation: makeStatementsJsonLD,
  }
  const { hasher, nonces, nonceGenerator, canonicalisation } = {
    ...defaults,
    ...options,
  }
  // use canonicalisation algorithm to make hashable statement strings
  const statements = canonicalisation(claim)
  // generate unsalted hashes from statements as a first step
  const unsalted = hashStatements(statements, {
    hasher,
    nonceGenerator: undefined,
  })
  // to simplify validation, the salted hash is computed over unsalted hash (nonce key) & nonce
  // the unsalted hash will work has the nonce key later, so we feed a hash:hash map to the hasher
  const salted = hashStatements(
    unsalted.reduce<Record<string, string>>((map, { hash }) => {
      return { ...map, [hash]: hash }
    }, {}),
    { hasher, nonces, nonceGenerator }
  )
  // produce array of salted hashes to add to credential (sorted to produce consistent outcomes)
  const hashes = salted
    .map(({ hash }) => hash)
    .sort((a, b) => hexToBn(a).cmp(hexToBn(b)))
  // produce nonce map, where each nonce is keyed with the unsalted hash
  const nonceMap = {}
  salted.forEach(({ key, nonce }) => {
    if (nonce) nonceMap[key] = nonce
  }, {})
  return { hashes, nonceMap }
}

/**
 *  Checks whether the input meets all the required criteria of an IClaim object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial IClaim.
 * @throws When input's cTypeHash do not exist.
 * @throws When any of the input's contents[key] is not of type 'number', 'boolean' or 'string'.
 * @throws [[ERROR_CTYPE_HASH_NOT_PROVIDED]], [[ERROR_CLAIM_CONTENTS_MALFORMED]].
 *
 */
export function errorCheck(input: IClaim): void {
  if (!input.cTypeHash) {
    throw SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
  }
  if (input.owner) {
    validateAddress(input.owner, 'Claim owner')
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
  validateHash(input.cTypeHash, 'Claim CType')
}

/**
 *  Compresses the [[Claim]] for storage and/or messaging.
 *
 * @param claim A [[Claim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[Claim]].
 */
export function compress(claim: IClaim): CompressedClaim {
  errorCheck(claim)
  const sortedContents = jsonabc.sortObj(claim.contents)
  return [sortedContents, claim.cTypeHash, claim.owner]
}

/**
 *  Decompresses the [[Claim]] from storage and/or message.
 *
 * @param claim A compressed [[Claim]] array that is reverted back into an object.
 * @throws When [[Claim]] is not an Array or it's length is unequal 3.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]].
 * @returns An object that has the same properties as the [[Claim]].
 */
export function decompress(claim: CompressedClaim): IClaim {
  if (!Array.isArray(claim) || claim.length !== 3) {
    throw SDKErrors.ERROR_DECOMPRESSION_ARRAY('Claim')
  }
  return {
    contents: claim[0],
    cTypeHash: claim[1],
    owner: claim[2],
  }
}

export default { decompress, compress, errorCheck }
