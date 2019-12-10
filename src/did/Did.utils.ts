/**
 * @module DID
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { isHex, hexToString } from '@polkadot/util'

import IPublicIdentity from '../types/PublicIdentity'
import { QueryResult } from '../blockchain/Blockchain'
import Did, {
  IDid,
  IDENTIFIER_PREFIX,
  IDidDocumentUnsigned,
  CONTEXT,
  KEY_TYPE_AUTHENTICATION,
  KEY_TYPE_SIGNATURE,
  KEY_TYPE_ENCRYPTION,
  SERVICE_KILT_MESSAGING,
} from './Did'

export function decodeDid(
  identifier: string,
  encoded: QueryResult
): IDid | null {
  const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
  if (json instanceof Array) {
    let documentStore = null
    if (isHex(json[2])) {
      documentStore = hexToString(json[2])
    }
    return Object.assign(Object.create(Did.prototype), {
      identifier,
      publicSigningKey: json[0],
      publicBoxKey: json[1],
      documentStore,
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

export function createDefaultDidDocument(
  identifier: string,
  publicBoxKey: string,
  publicSigningKey: string,
  kiltServiceEndpoint?: string
): IDidDocumentUnsigned {
  return {
    id: identifier,
    '@context': CONTEXT,
    authentication: {
      type: KEY_TYPE_AUTHENTICATION,
      publicKey: [`${identifier}#key-1`],
    },
    publicKey: [
      {
        id: `${identifier}#key-1`,
        type: KEY_TYPE_SIGNATURE,
        controller: identifier,
        publicKeyHex: publicSigningKey,
      },
      {
        id: `${identifier}#key-2`,
        type: KEY_TYPE_ENCRYPTION,
        controller: identifier,
        publicKeyHex: publicBoxKey,
      },
    ],
    service: kiltServiceEndpoint
      ? [
          {
            type: SERVICE_KILT_MESSAGING,
            serviceEndpoint: kiltServiceEndpoint,
          },
        ]
      : [],
  }
}
