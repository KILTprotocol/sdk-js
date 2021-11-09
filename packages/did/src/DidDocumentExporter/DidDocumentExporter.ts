/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module DID
 */

import { base58Encode } from '@polkadot/util-crypto'
import { hexToU8a } from '@polkadot/util'

import type {
  IDidDocument,
  IJsonLDDidDocument,
  IDidDetails,
  IDidDocumentExporter,
} from '@kiltprotocol/types'
import {
  KeyRelationship,
  VerificationKeyTypesMap,
  EncryptionKeyTypesMap,
} from '@kiltprotocol/types'

function exportToJsonDidDocument(details: IDidDetails): IDidDocument {
  const result: any = {}

  result.id = details.did
  result.verificationMethod = new Array<string>()

  // Populate the `verificationMethod` array and then sets the `authentication` array with the key IDs (or undefined if no auth key is present - which should never happen)
  const authenticationKeysIds = details
    .getKeys(KeyRelationship.authentication)
    .map((authKey) => {
      result.verificationMethod.push({
        id: authKey.id,
        controller: details.did,
        type: VerificationKeyTypesMap[authKey.type],
        publicKeyBase58: base58Encode(hexToU8a(authKey.publicKeyHex)),
      })
      // Parse only the key ID from the complete key URI
      return authKey.id
    })
  if (authenticationKeysIds.length) {
    result.authentication = authenticationKeysIds
  }

  const keyAgreementKeysIds = details
    .getKeys(KeyRelationship.keyAgreement)
    .map((keyAgrKey) => {
      result.verificationMethod.push({
        id: keyAgrKey.id,
        controller: details.did,
        type: EncryptionKeyTypesMap[keyAgrKey.type],
        publicKeyBase58: base58Encode(hexToU8a(keyAgrKey.publicKeyHex)),
      })
      return keyAgrKey.id
    })
  if (keyAgreementKeysIds.length) {
    result.keyAgreement = keyAgreementKeysIds
  }

  const assertionKeysIds = details
    .getKeys(KeyRelationship.assertionMethod)
    .map((assKey) => {
      result.verificationMethod.push({
        id: assKey.id,
        controller: details.did,
        type: VerificationKeyTypesMap[assKey.type],
        publicKeyBase58: base58Encode(hexToU8a(assKey.publicKeyHex)),
      })
      return assKey.id
    })
  if (assertionKeysIds.length) {
    result.assertionMethod = assertionKeysIds
  }

  const delegationKeyIds = details
    .getKeys(KeyRelationship.capabilityDelegation)
    .map((delKey) => {
      result.verificationMethod.push({
        id: delKey.id,
        controller: details.did,
        type: VerificationKeyTypesMap[delKey.type],
        publicKeyBase58: base58Encode(hexToU8a(delKey.publicKeyHex)),
      })
      return delKey.id
    })
  if (delegationKeyIds.length) {
    result.capabilityDelegation = delegationKeyIds
  }

  const serviceEndpoints = details.getEndpoints()
  if (serviceEndpoints.length) {
    result.service = serviceEndpoints.map((service) => {
      return {
        id: service.id,
        type: service.types,
        serviceEndpoints: service.urls,
      }
    })
  }

  return result as IDidDocument
}

function exportToJsonLdDidDocument(details: IDidDetails): IJsonLDDidDocument {
  const document = exportToJsonDidDocument(details)
  document['@context'] = ['https://www.w3.org/ns/did/v1']
  return document as IJsonLDDidDocument
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
): IDidDocument {
  switch (mimeType) {
    case 'application/json':
      return exportToJsonDidDocument(details)
    case 'application/ld+json':
      return exportToJsonLdDidDocument(details)
    default:
      throw new Error(
        `${mimeType} not supported by any of the available exporters.`
      )
  }
}

export const DidDocumentExporter: IDidDocumentExporter = { exportToDidDocument }
