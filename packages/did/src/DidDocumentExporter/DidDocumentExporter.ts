/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { base58Encode } from '@polkadot/util-crypto'

import type {
  DidDocument,
  IDidDetails,
  IDidDocumentExporter,
  JsonLDDidDocument,
} from '@kiltprotocol/types'
import {
  KeyRelationship,
  VerificationKeyTypesMap,
  EncryptionKeyTypesMap,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

function exportToJsonDidDocument(details: IDidDetails): DidDocument {
  const result: any = {}

  result.id = details.uri
  result.verificationMethod = new Array<string>()

  // Populate the `verificationMethod` array and then sets the `authentication` array with the key IDs (or undefined if no auth key is present - which should never happen)
  const authenticationKeysIds = details
    .getVerificationKeys(KeyRelationship.authentication)
    .map((authKey) => {
      result.verificationMethod.push({
        id: `${details.uri}#${authKey.id}`,
        controller: details.uri,
        type: VerificationKeyTypesMap[authKey.type],
        publicKeyBase58: base58Encode(authKey.publicKey),
      })
      return `${details.uri}#${authKey.id}`
    })
  if (authenticationKeysIds.length) {
    result.authentication = authenticationKeysIds
  }

  const keyAgreementKeysIds = details
    .getEncryptionKeys(KeyRelationship.keyAgreement)
    .map((keyAgrKey) => {
      result.verificationMethod.push({
        id: `${details.uri}#${keyAgrKey.id}`,
        controller: details.uri,
        type: EncryptionKeyTypesMap[keyAgrKey.type],
        publicKeyBase58: base58Encode(keyAgrKey.publicKey),
      })
      return `${details.uri}#${keyAgrKey.id}`
    })
  if (keyAgreementKeysIds.length) {
    result.keyAgreement = keyAgreementKeysIds
  }

  const assertionKeysIds = details
    .getVerificationKeys(KeyRelationship.assertionMethod)
    .map((assKey) => {
      result.verificationMethod.push({
        id: `${details.uri}#${assKey.id}`,
        controller: details.uri,
        type: VerificationKeyTypesMap[assKey.type],
        publicKeyBase58: base58Encode(assKey.publicKey),
      })
      return `${details.uri}#${assKey.id}`
    })
  if (assertionKeysIds.length) {
    result.assertionMethod = assertionKeysIds
  }

  const delegationKeyIds = details
    .getVerificationKeys(KeyRelationship.capabilityDelegation)
    .map((delKey) => {
      result.verificationMethod.push({
        id: `${details.uri}#${delKey.id}`,
        controller: details.uri,
        type: VerificationKeyTypesMap[delKey.type],
        publicKeyBase58: base58Encode(delKey.publicKey),
      })
      return `${details.uri}#${delKey.id}`
    })
  if (delegationKeyIds.length) {
    result.capabilityDelegation = delegationKeyIds
  }

  const serviceEndpoints = details.getEndpoints()
  if (serviceEndpoints.length) {
    result.service = serviceEndpoints.map((service) => {
      return {
        id: `${details.uri}#${service.id}`,
        type: service.types,
        serviceEndpoint: service.urls,
      }
    })
  }

  return result as DidDocument
}

function exportToJsonLdDidDocument(details: IDidDetails): JsonLDDidDocument {
  const document = exportToJsonDidDocument(details)
  document['@context'] = ['https://www.w3.org/ns/did/v1']
  return document as JsonLDDidDocument
}

/**
 * Export an instance of [[IDidDetails]] to a W3c-compliant DID Document in the format provided.
 *
 * @param details The [[IDidDetails]] instance.
 * @param mimeType The format for the output DID Document. Accepted values are `application/json` and `application/ld+json`.
 * @returns The DID Document formatted according to the mime type provided, or an error if the format specified is not supported.
 */
export function exportToDidDocument(
  details: IDidDetails,
  mimeType: string
): DidDocument {
  switch (mimeType) {
    case 'application/json':
      return exportToJsonDidDocument(details)
    case 'application/ld+json':
      return exportToJsonLdDidDocument(details)
    default:
      throw new SDKErrors.ERROR_DID_EXPORTER_ERROR(
        `${mimeType} not supported by any of the available exporters.`
      )
  }
}

export const DidDocumentExporter: IDidDocumentExporter = { exportToDidDocument }
