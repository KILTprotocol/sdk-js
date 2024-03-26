/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Claims are a core building block of the KILT SDK. A claim represents **something an entity claims about itself**. Once created, a claim can be used to create a {@link Credential}.
 *
 * A claim object has:
 * * contents - among others, the pure content of a claim, for example `"isOver18": true`;
 * * a {@link ICType | CType} that represents its data structure.
 *
 * A claim object's owner is (should be) the same entity as the claimer.
 *
 * @packageDocumentation
 */

import { CType } from '@kiltprotocol/credentials'
import * as Did from '@kiltprotocol/did'
import type {
  Did as KiltDid,
  HexString,
  ICType,
  IClaim,
  PartialClaim,
} from '@kiltprotocol/types'
import { Crypto, DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { hexToBn } from '@polkadot/util'

import { makeStatementsJsonLD } from './utils.js'

/**
 * Produces salted hashes of individual statements comprising a (partial) {@link IClaim} to enable selective disclosure of contents. Can also be used to reproduce hashes for the purpose of validation.
 *
 * @param claim Full or partial {@link IClaim} to produce statement hashes from.
 * @param options Object containing optional parameters.
 * @param options.canonicalisation Canonicalisation routine that produces an array of statement strings from the [IClaim]. Default produces individual `{"key":"value"}` JSON representations where keys are transformed to expanded JSON-LD.
 * @param options.nonces Optional map of nonces as produced by this function.
 * @param options.nonceGenerator Nonce generator as defined by {@link Crypto.hashStatements} to be used if no `nonces` are given. Default produces random UUIDs (v4).
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
 * Used to verify the hash list based proof over the set of disclosed attributes in a {@link IClaim | Claim}.
 *
 * @param claim Full or partial {@link IClaim} to verify proof against.
 * @param proof Proof consisting of a map that matches nonces to statement digests and the resulting hashes.
 * @param proof.nonces A map where a statement digest as produces by options.hasher is mapped to a nonce.
 * @param proof.hashes Array containing hashes which are signed into the credential. Should result from feeding statement digests and nonces in proof.nonce to options.hasher.
 * @param options Object containing optional parameters.
 * @param options.canonicalisation Canonicalisation routine that produces an array of statement strings from the {@link IClaim}. Default produces individual `{"key":"value"}` JSON representations where keys are transformed to expanded JSON-LD.
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
 * Checks whether the input meets all the required criteria of an {@link IClaim} object.
 * Throws on invalid input.
 *
 * @param input The potentially only partial IClaim.
 */
export function verifyDataStructure(input: IClaim | PartialClaim): void {
  if (!input.cTypeHash) {
    throw new SDKErrors.CTypeHashMissingError()
  }
  if ('owner' in input) {
    Did.validateDid(input.owner, 'Did')
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
 * Builds a {@link IClaim | Claim} from a {@link ICType | CType} which is composed of other (nested) CTypes.
 *
 * @param cTypeInput A CType object that contains nested CTypes.
 * @param nestedCType The array of CTypes which are used inside the main CType above.
 * @param claimContents The {@link IClaim.contents | Claim contents} from which to build the new Claim.
 * @param claimOwner The DID of the owner of the new Claim.
 *
 * @returns A {@link IClaim | Claim} the owner can use.
 */
export function fromNestedCTypeClaim(
  cTypeInput: ICType,
  nestedCType: ICType[],
  claimContents: IClaim['contents'],
  claimOwner: KiltDid
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
 * Constructs a new Claim from the given {@link ICType}, {@link IClaim.contents} and {@link KiltDid | Kilt DID}.
 *
 * @param cType The {@link ICType} for which the Claim will be built.
 * @param claimContents {@link IClaim.contents} To be used as the pure contents of the instantiated Claim.
 * @param claimOwner The DID to be used as the Claim owner.
 * @returns A Claim object.
 */
export function fromCTypeAndClaimContents(
  cType: ICType,
  claimContents: IClaim['contents'],
  claimOwner: KiltDid
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
 * Custom Type Guard to determine input being of type {@link IClaim}.
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
