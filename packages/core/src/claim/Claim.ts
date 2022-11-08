/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Claims are a core building block of the KILT SDK. A claim represents **something an entity claims about itself**. Once created, a claim can be used to create a [[Credential]].
 *
 * A claim object has:
 * * contents - among others, the pure content of a claim, for example `"isOver18": true`;
 * * a [[CType]] that represents its data structure.
 *
 * A claim object's owner is (should be) the same entity as the claimer.
 *
 * @packageDocumentation
 */

import { hexToBn } from '@polkadot/util'
import type { HexString } from '@polkadot/util/types'
import type { DidUri, IClaim, ICType, PartialClaim } from '@kiltprotocol/types'
import { Crypto, DataUtils, SDKErrors } from '@kiltprotocol/utils'
import * as Did from '@kiltprotocol/did'
import * as CType from '../ctype/index.js'

const VC_VOCAB = 'https://www.w3.org/2018/credentials#'

/**
 * Produces JSON-LD readable representations of [[IClaim]]['contents']. This is done by implicitly or explicitly transforming property keys to globally unique predicates.
 * Where possible these predicates are taken directly from the Verifiable Credentials vocabulary. Properties that are unique to a [[CType]] are transformed into predicates by prepending the [[CType]][schema][$id].
 *
 * @param claim A (partial) [[IClaim]] from to build a JSON-LD representation from. The `cTypeHash` property is required.
 * @param expanded Return an expanded instead of a compacted representation. While property transformation is done explicitly in the expanded format, it is otherwise done implicitly via adding JSON-LD's reserved `@context` properties while leaving [[IClaim]][contents] property keys untouched.
 * @returns An object which can be serialized into valid JSON-LD representing an [[IClaim]]'s ['contents'].
 */
function jsonLDcontents(
  claim: PartialClaim,
  expanded = true
): Record<string, unknown> {
  const { cTypeHash, contents, owner } = claim
  if (!cTypeHash) throw new SDKErrors.CTypeHashMissingError()
  const vocabulary = `${CType.hashToId(cTypeHash)}#`
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
 * Produces JSON-LD readable representations of KILT claims. This is done by implicitly or explicitly transforming property keys to globally unique predicates.
 * Where possible these predicates are taken directly from the Verifiable Credentials vocabulary. Properties that are unique to a [[CType]] are transformed into predicates by prepending the [[CType]][schema][$id].
 *
 * @param claim A (partial) [[IClaim]] from to build a JSON-LD representation from. The `cTypeHash` property is required.
 * @param expanded Return an expanded instead of a compacted representation. While property transformation is done explicitly in the expanded format, it is otherwise done implicitly via adding JSON-LD's reserved `@context` properties while leaving [[IClaim]][contents] property keys untouched.
 * @returns An object which can be serialized into valid JSON-LD representing an [[IClaim]].
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
    '@id': CType.hashToId(claim.cTypeHash),
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
    if (!nonce) throw new SDKErrors.ClaimNonceMapMalformedError(statement)
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
): void {
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
  const { verified, errors } = hashed.reduce<{
    verified: boolean
    errors: Error[]
  }>(
    (status, { saltedHash, statement, digest, nonce }) => {
      // check if the statement digest was contained in the proof and mapped it to a nonce
      if (!digestsInProof.includes(digest) || !nonce) {
        status.errors.push(new SDKErrors.NoProofForStatementError(statement))
        return { ...status, verified: false }
      }
      // check if the hash is whitelisted in the proof
      if (!proof.hashes.includes(saltedHash)) {
        status.errors.push(
          new SDKErrors.InvalidProofForStatementError(statement)
        )
        return { ...status, verified: false }
      }
      return status
    },
    { verified: true, errors: [] }
  )
  if (verified !== true) {
    throw new SDKErrors.ClaimUnverifiableError(
      'One or more statements in the claim could not be verified',
      { cause: errors }
    )
  }
}

/**
 * Checks whether the input meets all the required criteria of an [[IClaim]] or [[IAssetClaim]] object.
 * Throws on invalid input.
 *
 * @param input The potentially only partial IClaim.
 */
export function verifyDataStructure(input: IClaim | PartialClaim): void {
  if (!input.cTypeHash) {
    throw new SDKErrors.CTypeHashMissingError()
  }
  if ('owner' in input) {
    // input is IClaim
    Did.validateUri(input.owner, 'Did')
  }
  if (input.contents !== undefined) {
    Object.entries(input.contents).forEach(([key, value]) => {
      if (
        !key ||
        typeof key !== 'string' ||
        !['string', 'number', 'boolean', 'object'].includes(typeof value)
      ) {
        throw new SDKErrors.ClaimContentsMalformedError()
      }
    })
  }
  DataUtils.verifyIsHex(input.cTypeHash, 256)
}

/**
 * Verifies the data structure and schema of a Claim.
 *
 * @param claimInput IClaim to verify.
 * @param cType ICType to verify claimInput's contents.
 */
export function verify(claimInput: IClaim, cType: ICType): void {
  CType.verifyClaimAgainstSchema(claimInput.contents, cType)
  verifyDataStructure(claimInput)
}

/**
 * Builds a [[Claim]] from a [[CType]] which has nested [[CType]]s within the schema.
 *
 * @param cTypeInput A [[CType]] object that has nested [[CType]]s.
 * @param nestedCType The array of [[CType]]s, which are used inside the main [[CType]].
 * @param claimContents The data inside the [[Claim]].
 * @param claimOwner The DID of the owner of the [[Claim]].
 *
 * @returns A [[Claim]] the owner can use.
 */
export function fromNestedCTypeClaim(
  cTypeInput: ICType,
  nestedCType: ICType[],
  claimContents: IClaim['contents'],
  claimOwner: DidUri
): IClaim {
  CType.verifyClaimAgainstNestedSchemas(cTypeInput, nestedCType, claimContents)

  const claim = {
    cTypeHash: CType.idToHash(cTypeInput.$id),
    contents: claimContents,
    owner: claimOwner,
  }
  verifyDataStructure(claim)
  return claim
}

/**
 * Constructs a new Claim from the given [[ICType]], IClaim['contents'] and [[DidUri]].
 *
 * @param cType [[ICType]] for which the Claim will be built.
 * @param claimContents IClaim['contents'] to be used as the pure contents of the instantiated Claim.
 * @param claimOwner The DID to be used as the Claim owner.
 * @returns A Claim object.
 */
export function fromCTypeAndClaimContents(
  cType: ICType,
  claimContents: IClaim['contents'],
  claimOwner: DidUri
): IClaim {
  CType.verifyDataStructure(cType)
  CType.verifyClaimAgainstSchema(claimContents, cType)
  const claim = {
    cTypeHash: CType.idToHash(cType.$id),
    contents: claimContents,
    owner: claimOwner,
  }
  verifyDataStructure(claim)
  return claim
}

/**
 * Custom Type Guard to determine input being of type IClaim.
 *
 * @param input The potentially only partial IClaim.
 *
 * @returns Boolean whether input is of type IClaim.
 */
export function isIClaim(input: unknown): input is IClaim {
  try {
    verifyDataStructure(input as IClaim)
  } catch (error) {
    return false
  }
  return true
}
