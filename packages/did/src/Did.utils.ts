/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { checkAddress } from '@polkadot/util-crypto'
import { isHex, u8aToHex } from '@polkadot/util'

import type {
  DidKey,
  DidSignature,
  IDidDetails,
  IDidIdentifier,
  IDidResolver,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { FullDidDetails } from './DidDetails'
import { DefaultResolver } from './DidResolver'

const KILT_DID_PREFIX = 'did:kilt:'

// Matches the following full DIDs
// - did:kilt:<kilt_address>
// - did:kilt:<kilt_address>#<fragment>
const FULL_KILT_DID_REGEX =
  /^did:kilt:(?<identifier>4[1-9a-km-zA-HJ-NP-Z]{47})(?<fragment>#[^#\n]+)?$/

// Matches the following light DIDs
// - did:kilt:light:00<kilt_address>
// - did:kilt:light:01<kilt_address>:<encoded_details>
// - did:kilt:light:10<kilt_address>#<fragment>
// - did:kilt:light:99<kilt_address>:<encoded_details>#<fragment>
const LIGHT_KILT_DID_REGEX =
  /^did:kilt:light:(?<auth_key_type>[0-9]{2})(?<identifier>4[1-9a-km-zA-HJ-NP-Z]{47,48})(?<encoded_details>:.+?)?(?<fragment>#[^#\n]+)?$/

export function getKiltDidFromIdentifier(
  identifier: IDidIdentifier,
  didType: 'full' | 'light',
  version: number,
  encodedDetails?: string
): IDidDetails['did'] {
  const typeString = didType === 'full' ? '' : `light:`
  const versionString = version === 1 ? '' : `v${version}:`
  const encodedDetailsString = encodedDetails ? `:${encodedDetails}` : ''
  return `${KILT_DID_PREFIX}${typeString}${versionString}${identifier}${encodedDetailsString}`
}

export type IDidParsingResult = {
  did: IDidDetails['did']
  version: number
  type: 'light' | 'full'
  identifier: IDidIdentifier
  fragment?: string
  authKeyTypeEncoding?: string
  encodedDetails?: string
}

export function parseDidUri(didUri: string): IDidParsingResult {
  let matches = FULL_KILT_DID_REGEX.exec(didUri)?.groups
  if (matches && matches.identifier) {
    const version = matches.version
      ? parseInt(matches.version, 10)
      : FullDidDetails.FULL_DID_LATEST_VERSION
    return {
      did: getKiltDidFromIdentifier(matches.identifier, 'full', version),
      version,
      type: 'full',
      identifier: matches.identifier,
      fragment: matches.fragment?.substring(1),
    }
  }

  // If it fails to parse full DID, try with light DID
  matches = LIGHT_KILT_DID_REGEX.exec(didUri)?.groups
  if (matches && matches.identifier && matches.auth_key_type) {
    const version = matches.version ? parseInt(matches.version, 10) : 1
    const lightDidIdentifier = matches.auth_key_type.concat(matches.identifier)
    const encodedDetails = matches.encoded_details
    return {
      did: getKiltDidFromIdentifier(
        lightDidIdentifier,
        'light',
        version,
        encodedDetails
      ),
      version,
      type: 'light',
      identifier: matches.auth_key_type.concat(matches.identifier),
      fragment: matches.fragment?.substring(1),
      encodedDetails: matches.encoded_details?.substring(1),
    }
  }

  throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
}

export function validateKiltDid(
  input: unknown,
  allowFragment = false
): input is IDidDetails['did'] {
  if (typeof input !== 'string') {
    throw TypeError(`DID string expected, got ${typeof input}`)
  }
  const { identifier, type, fragment } = parseDidUri(input)
  if (!allowFragment && fragment) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT(input)
  }

  switch (type) {
    case 'full':
      if (!checkAddress(identifier, 38)[0]) {
        throw SDKErrors.ERROR_ADDRESS_INVALID(identifier, 'DID identifier')
      }
      break
    case 'light':
      // Identifier includes the first two characters for the key type encoding
      if (!checkAddress(identifier.substring(2), 38)[0]) {
        throw SDKErrors.ERROR_ADDRESS_INVALID(identifier, 'DID identifier')
      }
      break
    default:
      throw SDKErrors.ERROR_UNSUPPORTED_DID(input)
  }
  return true
}

export function validateDidSignature(signature: DidSignature): boolean {
  try {
    if (
      !isHex(signature.signature) ||
      !validateKiltDid(signature.keyId, true)
    ) {
      throw SDKErrors.ERROR_SIGNATURE_DATA_TYPE()
    }
    return true
  } catch (e) {
    throw SDKErrors.ERROR_SIGNATURE_DATA_TYPE()
  }
}

type DidSignatureVerificationFromDetailsInput = {
  message: string | Uint8Array
  signature: string
  keyId: DidKey['id']
  expectedVerificationMethod?: VerificationKeyRelationship
  details: IDidDetails
}

export type VerificationResult = {
  verified: boolean
  reason?: string
  didDetails?: IDidDetails
  key?: DidKey
}

function verifyDidSignatureFromDetails({
  message,
  signature,
  keyId,
  expectedVerificationMethod,
  details,
}: DidSignatureVerificationFromDetailsInput): VerificationResult {
  const key = details.getKey(keyId)
  if (!key) {
    return {
      verified: false,
      reason: `No key with ID ${keyId} for the DID ${details.did}`,
    }
  }
  // Check whether the provided key ID is within the keys for a given verification relationship, if provided.
  if (
    expectedVerificationMethod &&
    !details
      .getKeys(expectedVerificationMethod)
      .map((verKey) => verKey.id)
      .includes(keyId)
  ) {
    return {
      verified: false,
      reason: `No key with ID ${keyId} for the verification method ${expectedVerificationMethod}`,
    }
  }
  const isSignatureValid = Crypto.verify(
    message,
    signature,
    u8aToHex(key.publicKey)
  )
  if (!isSignatureValid) {
    return {
      verified: false,
      reason: 'Invalid signature',
    }
  }
  return {
    verified: true,
    didDetails: details,
    key,
  }
}

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: DidSignature
  expectedVerificationMethod?: VerificationKeyRelationship
  resolver?: IDidResolver
}

// Verify a DID signature given the key ID of the signature.
// A signature verification returns false if a migrated and then deleted DID is used.
export async function verifyDidSignature({
  message,
  signature,
  expectedVerificationMethod,
  resolver = DefaultResolver,
}: DidSignatureVerificationInput): Promise<VerificationResult> {
  const resolutionDetails = await resolver.resolveDoc(signature.keyId)
  // Verification fails if the DID does not exist at all.
  if (!resolutionDetails) {
    return {
      verified: false,
      reason: `No result for provided key ID ${signature.keyId}`,
    }
  }
  // Verification also fails if the DID has been deleted.
  if (resolutionDetails.metadata.deactivated) {
    return {
      verified: false,
      reason: 'DID for provided key is deactivated.',
    }
  }
  // Verification also fails if the signer is a migrated light DID.
  if (resolutionDetails.metadata.canonicalId) {
    return {
      verified: false,
      reason: 'DID for provided key has been migrated and not usable anymore.',
    }
  }
  // Otherwise, the details used are either the migrated full DID details or the light DID details.
  const details = (
    resolutionDetails.metadata.canonicalId
      ? (await resolver.resolveDoc(resolutionDetails.metadata.canonicalId))
          ?.details
      : resolutionDetails.details
  ) as IDidDetails

  return verifyDidSignatureFromDetails({
    message,
    signature: signature.signature,
    keyId: signature.keyId,
    expectedVerificationMethod,
    details,
  })
}
