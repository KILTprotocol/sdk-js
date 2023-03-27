/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { base58Encode } from '@polkadot/util-crypto'

import type {
  DidDocument,
  ConformingDidDocument,
  DidResourceUri,
  JsonLDDidDocument,
  UriFragment,
} from '@kiltprotocol/types'
import {
  encryptionKeyTypesMap,
  verificationKeyTypesMap,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { KILT_DID_CONTEXT_URL, W3C_DID_CONTEXT_URL } from './DidContexts.js'

function exportToJsonDidDocument(did: DidDocument): ConformingDidDocument {
  const {
    uri: controller,
    authentication,
    assertionMethod = [],
    capabilityDelegation = [],
    keyAgreement = [],
    service = [],
  } = did

  function toAbsoluteUri(keyId: UriFragment): DidResourceUri {
    if (keyId.startsWith(controller)) {
      return keyId as DidResourceUri
    }
    return `${controller}${keyId}`
  }

  const verificationMethod: ConformingDidDocument['verificationMethod'] = [
    ...authentication,
    ...assertionMethod,
    ...capabilityDelegation,
  ]
    .map((key) => ({ ...key, type: verificationKeyTypesMap[key.type] }))
    .concat(
      keyAgreement.map((key) => ({
        ...key,
        type: encryptionKeyTypesMap[key.type],
      }))
    )
    .map(({ id, type, publicKey }) => ({
      id: toAbsoluteUri(id),
      controller,
      type,
      publicKeyBase58: base58Encode(publicKey),
    }))
    .filter(
      // remove duplicates
      ({ id }, index, array) =>
        index === array.findIndex((key) => key.id === id)
    )

  return {
    id: controller,
    verificationMethod,
    authentication: [toAbsoluteUri(authentication[0].id)],
    ...(assertionMethod[0] && {
      assertionMethod: [toAbsoluteUri(assertionMethod[0].id)],
    }),
    ...(capabilityDelegation[0] && {
      capabilityDelegation: [toAbsoluteUri(capabilityDelegation[0].id)],
    }),
    ...(keyAgreement.length > 0 && {
      keyAgreement: [toAbsoluteUri(keyAgreement[0].id)],
    }),
    ...(service.length > 0 && {
      service: service.map((endpoint) => ({
        ...endpoint,
        id: `${controller}${endpoint.id}`,
      })),
    }),
  }
}

function exportToJsonLdDidDocument(did: DidDocument): JsonLDDidDocument {
  const document = exportToJsonDidDocument(did)
  document['@context'] = [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL]
  return document as JsonLDDidDocument
}

/**
 * Export a [[DidDocument]] to a W3C-spec conforming DID Document in the format provided.
 *
 * @param did The [[DidDocument]].
 * @param mimeType The format for the output DID Document. Accepted values are `application/json` and `application/ld+json`.
 * @returns The DID Document formatted according to the mime type provided, or an error if the format specified is not supported.
 */
export function exportToDidDocument(
  did: DidDocument,
  mimeType: 'application/json' | 'application/ld+json'
): ConformingDidDocument {
  switch (mimeType) {
    case 'application/json':
      return exportToJsonDidDocument(did)
    case 'application/ld+json':
      return exportToJsonLdDidDocument(did)
    default:
      throw new SDKErrors.DidExporterError(
        `The MIME type "${mimeType}" not supported by any of the available exporters`
      )
  }
}
