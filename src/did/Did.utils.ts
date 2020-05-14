/**
 * @packageDocumentation
 * @ignore
 */

import { isHex, hexToString } from '@polkadot/util'

import { Tuple, Option } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { hasNonNullByte, assertCodecIsType } from '../util/Decode'
import IPublicIdentity from '../types/PublicIdentity'
import Crypto from '../crypto'
import Identity from '../identity/Identity'
import {
  IDid,
  IDidDocument,
  IDidDocumentSigned,
  IDENTIFIER_PREFIX,
  CONTEXT,
  KEY_TYPE_AUTHENTICATION,
  KEY_TYPE_SIGNATURE,
  KEY_TYPE_ENCRYPTION,
  SERVICE_KILT_MESSAGING,
} from './Did'

interface IEncodedDid extends Codec {
  toJSON: () => [string, string, string | null] | null
}

export function decodeDid(
  identifier: string,
  encoded: Option<Tuple> | Tuple
): IDid | null {
  assertCodecIsType(encoded, [
    'Option<(H256,H256,Option<Bytes>)>',
    '(H256,H256,Option<Bytes>)',
  ])
  if (encoded instanceof Option || hasNonNullByte(encoded)) {
    const decoded = (encoded as IEncodedDid).toJSON()
    if (decoded) {
      const documentStore = isHex(decoded[2]) ? hexToString(decoded[2]) : null
      return {
        identifier,
        publicSigningKey: decoded[0],
        publicBoxKey: decoded[1],
        documentStore,
      }
    }
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
): IDidDocument {
  return {
    id: identifier,
    '@context': CONTEXT,
    authentication: [
      {
        type: KEY_TYPE_AUTHENTICATION,
        publicKey: [`${identifier}#key-1`],
      },
    ],
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

export function verifyDidDocumentSignature(
  didDocument: IDidDocumentSigned,
  identifier: string
): boolean {
  if (!didDocument || !didDocument.signature || !identifier) {
    throw new Error(
      `Missing data for verification (either didDocument, didDocumentHash, signature, or address is missing):\n
          didDocument:\n
          ${didDocument}\n
          signature:\n
          ${didDocument.signature}\n
          address:\n
          ${identifier}\n
          `
    )
  }
  const { id } = didDocument
  if (identifier !== id) {
    throw new Error(
      `This identifier (${identifier}) doesn't match the DID Document's identifier (${id})`
    )
  }
  const unsignedDidDocument = { ...didDocument }
  delete unsignedDidDocument.signature
  return Crypto.verify(
    Crypto.hashObjectAsStr(unsignedDidDocument),
    didDocument.signature,
    getAddressFromIdentifier(identifier)
  )
}

export function signDidDocument(
  didDocument: IDidDocument,
  identity: Identity
): IDidDocumentSigned {
  const didDocumentHash = Crypto.hashObjectAsStr(didDocument)
  return {
    ...didDocument,
    signature: identity.signStr(didDocumentHash),
  }
}
