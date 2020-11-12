/**
 * @packageDocumentation
 * @module ClaimUtils
 * @preferred
 */

import { AnyJson } from '@polkadot/types/types'
import { v4 as uuid } from 'uuid'
import { blake2AsHex } from '@polkadot/util-crypto'
import jsonabc from '../util/jsonabc'
import * as SDKErrors from '../errorhandling/SDKErrors'
import IClaim, { CompressedClaim } from '../types/Claim'
import { validateAddress, validateHash } from '../util/DataUtils'

const VC_VOCAB = 'https://www.w3.org/2018/credentials#'

function JsonLDcontents(
  claim: Partial<IClaim> & Pick<IClaim, 'cTypeHash'>,
  expanded = true
): Record<string, AnyJson> {
  const { cTypeHash, contents, owner } = claim
  if (!cTypeHash)
    throw new Error('ctype hash is required for conversion to json-ld')
  const vocabulary = `kilt:ctype:${cTypeHash}#`
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

export function toJsonLD(
  claim: Partial<IClaim> & Pick<IClaim, 'cTypeHash'>,
  expanded = true
): Record<string, AnyJson> {
  const credentialSubject = JsonLDcontents(claim, expanded)
  const prefix = expanded ? VC_VOCAB : ''
  const result = {
    [`${prefix}credentialSubject`]: credentialSubject,
  }
  result[`${prefix}credentialSchema`] = {
    '@id': `kilt:ctype:${claim.cTypeHash}`,
  }
  if (!expanded) result['@context'] = { '@vocab': VC_VOCAB }

  return result
}

export interface Hasher {
  (value: string, nonce?: string): string
}

export const defaultHasher: Hasher = (value, nonce) =>
  blake2AsHex((nonce || '') + value)

export function hashClaimContents(
  claim: IClaim,
  options: {
    nonces?: Record<string, string> | ((key: string) => string)
    hasher?: Hasher
  } = {}
): Array<{ key: string; nonce: string; hash: string }> {
  const defaults = {
    hasher: defaultHasher,
    nonces: () => uuid(),
  }
  const { hasher, nonces } = { ...defaults, ...options }
  const getNonce =
    typeof nonces === 'function' ? nonces : (key: string) => nonces[key]
  const normalized = JsonLDcontents(claim, true)
  const statements = Object.entries(normalized).map(([key, value]) =>
    JSON.stringify({ [key]: value })
  )
  return statements.map((statement) => {
    const key = hasher(statement)
    const nonce = getNonce(key)
    if (!nonce)
      // TODO: use sdk error module
      throw new Error(
        `could not retrieve nonce for statement ${statement} with hash key ${key}`
      )
    return {
      key,
      nonce,
      // to simplify validation, the salted hash is computed over unsalted hash (nonce key) & nonce
      hash: hasher(key, nonce),
    }
  })
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
