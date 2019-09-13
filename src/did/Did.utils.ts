/**
 * @module DID
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { hexToU8a, u8aToString } from '@polkadot/util'

import IPublicIdentity from '../types/PublicIdentity'
import { QueryResult } from '../blockchain/Blockchain'
import Did, { IDid, IDENTIFIER_PREFIX } from './Did'

export function decodeDid(
  identifier: string,
  encoded: QueryResult
): IDid | null {
  const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
  if (json instanceof Array) {
    const documentStore = hexToU8a(json[2])
    return Object.assign(Object.create(Did.prototype), {
      identifier,
      publicSigningKey: json[0],
      publicBoxKey: json[1],
      documentStore:
        documentStore.length > 0 ? u8aToString(documentStore) : null,
    })
  }
  return null
}

export function getIdentifierFromAddress(
  address: IPublicIdentity['address']
): IDid['identifier'] {
  return IDENTIFIER_PREFIX + address
}

export function getAddressFromIdentifier(
  identifier: IDid['identifier']
): IPublicIdentity['address'] {
  if (!identifier.startsWith(IDENTIFIER_PREFIX)) {
    throw new Error(`Not a KILT did: ${identifier}`)
  }
  return identifier.substr(IDENTIFIER_PREFIX.length)
}
