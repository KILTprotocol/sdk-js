/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { decodeAddress } from '@polkadot/util-crypto'

import type {
  DidDocument,
  DidUri,
  NewLightDidVerificationKey,
} from '@kiltprotocol/types'

import { SDKErrors, ss58Format } from '@kiltprotocol/utils'

import { getAddressByKey, KILT_DID_PREFIX, parseDidUri } from '../Did.utils.js'

import {
  validateCreateDocumentInput,
  decodeAndDeserializeAdditionalLightDidDetails,
  CreateDocumentInput,
  serializeAndEncodeAdditionalLightDidDetails,
  verificationKeyTypeToLightDidEncoding,
  lightDidEncodingToVerificationKeyType,
} from './LightDidDetails.utils.js'

const authenticationKeyId = '#authentication'
const encryptionKeyId = '#encryption'

/**
 * Create [[DidDocument]] of a light DID using the provided keys and endpoints.
 * Sets proper key IDs, builds light DID URI.
 * Private keys are assumed to already live in another storage, as it contains reference only to public keys.
 *
 * @param input The input.
 * @param input.authentication The array containing light DID authentication key.
 * @param input.keyAgreement The optional array containing light DID encryption key.
 * @param input.service The optional light DID service endpoints.
 *
 * @returns The resulting [[DidDocument]].
 */
export function createLightDidDocument({
  authentication,
  keyAgreement = undefined,
  service,
}: CreateDocumentInput): DidDocument {
  validateCreateDocumentInput({
    authentication,
    keyAgreement,
    service,
  })
  const encodedDetails = serializeAndEncodeAdditionalLightDidDetails({
    keyAgreement,
    service,
  })
  // Validity is checked in validateCreateDocumentInput
  const authenticationKeyTypeEncoding =
    verificationKeyTypeToLightDidEncoding[authentication[0].type]
  const address = getAddressByKey(authentication[0])

  const encodedDetailsString = encodedDetails ? `:${encodedDetails}` : ''
  const uri =
    `${KILT_DID_PREFIX}light:${authenticationKeyTypeEncoding}${address}${encodedDetailsString}` as DidUri

  const did: DidDocument = {
    uri,
    authentication: [
      {
        id: authenticationKeyId, // Authentication key always has the #authentication ID.
        ...authentication[0],
      },
    ],
    service,
  }

  if (keyAgreement) {
    did.keyAgreement = [
      {
        id: encryptionKeyId, // Encryption key always has the #encryption ID.
        ...keyAgreement[0],
      },
    ]
  }

  return did
}

/**
 * Create [[DidDocument]] of a light DID by parsing the provided input URI.
 * Only use for DIDs you control, when you are certain they have not been upgraded to on-chain full DIDs.
 * For the DIDs you have received from external sources use [[resolve]] etc.
 *
 * Parsing is possible because of the self-describing and self-containing nature of light DIDs.
 * Private keys are assumed to already live in another storage, as it contains reference only to public keys.
 *
 * @param uri The DID URI to parse.
 * @param failIfFragmentPresent Whether to fail when parsing the URI in case a fragment is present or not, which is not relevant to the creation of the DID. It defaults to true.
 *
 * @returns The resulting [[DidDocument]].
 */
export function parseDocumentFromLightDid(
  uri: DidUri,
  failIfFragmentPresent = true
): DidDocument {
  const {
    address,
    version,
    encodedDetails,
    fragment,
    type,
    authKeyTypeEncoding,
  } = parseDidUri(uri)

  if (type !== 'light') {
    throw new SDKErrors.DidError(
      `Cannot build a light DID from the provided URI "${uri}" because it does not refer to a light DID`
    )
  }
  if (fragment && failIfFragmentPresent) {
    throw new SDKErrors.DidError(
      `Cannot build a light DID from the provided URI "${uri}" because it has a fragment`
    )
  }
  const keyType =
    authKeyTypeEncoding &&
    lightDidEncodingToVerificationKeyType[authKeyTypeEncoding]

  if (!keyType) {
    throw new SDKErrors.DidError(
      `Authentication key encoding "${authKeyTypeEncoding}" does not match any supported key type`
    )
  }
  const publicKey = decodeAddress(address, false, ss58Format)
  const authentication: [NewLightDidVerificationKey] = [
    { publicKey, type: keyType },
  ]
  if (!encodedDetails) {
    return createLightDidDocument({ authentication })
  }
  const { keyAgreement, service } =
    decodeAndDeserializeAdditionalLightDidDetails(encodedDetails, version)
  return createLightDidDocument({
    authentication,
    keyAgreement,
    service,
  })
}
