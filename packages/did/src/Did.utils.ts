/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidSignature,
  IDidDetails,
  IDidResolver,
  DidKey,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { SDKErrors, Crypto } from '@kiltprotocol/utils'
import { isHex } from '@polkadot/util'
import { checkAddress } from '@polkadot/util-crypto'
import { DefaultResolver } from './DidResolver/DefaultResolver'
import type { PublicKeyEnum, IDidParsingResult } from './types'

export const KILT_DID_PREFIX = 'did:kilt:'

// Matches the following full DIDs
// - did:kilt:<kilt_address>
// - did:kilt:<kilt_address>#<fragment>
export const FULL_KILT_DID_REGEX =
  /^did:kilt:(?<identifier>4[1-9a-km-zA-HJ-NP-Z]{47})(?<fragment>#[^#\n]+)?$/

// Matches the following light DIDs
// - did:kilt:light:00<kilt_address>
// - did:kilt:light:01<kilt_address>:<encoded_details>
// - did:kilt:light:10<kilt_address>#<fragment>
// - did:kilt:light:99<kilt_address>:<encoded_details>#<fragment>
export const LIGHT_KILT_DID_REGEX =
  /^did:kilt:light:(?<auth_key_type>[0-9]{2})(?<identifier>4[1-9a-km-zA-HJ-NP-Z]{47,48})(?<encoded_details>:.+?)?(?<fragment>#[^#\n]+)?$/

export enum CHAIN_SUPPORTED_SIGNATURE_KEY_TYPES {
  ed25519 = 'ed25519',
  sr25519 = 'sr25519',
  secp256k1 = 'secp256k1',
}

export enum CHAIN_SUPPORTED_ENCRYPTION_KEY_TYPES {
  x25519 = 'x25519',
}

export const CHAIN_SUPPORTED_KEY_TYPES = {
  ...CHAIN_SUPPORTED_ENCRYPTION_KEY_TYPES,
  ...CHAIN_SUPPORTED_SIGNATURE_KEY_TYPES,
}
export type CHAIN_SUPPORTED_KEY_TYPES = typeof CHAIN_SUPPORTED_KEY_TYPES

const SignatureAlgForKeyType = {
  [CHAIN_SUPPORTED_SIGNATURE_KEY_TYPES.ed25519]: 'ed25519',
  [CHAIN_SUPPORTED_SIGNATURE_KEY_TYPES.sr25519]: 'sr25519',
  [CHAIN_SUPPORTED_SIGNATURE_KEY_TYPES.secp256k1]: 'ecdsa-secp256k1',
}

export function getSignatureAlgForKeyType(keyType: string): string | undefined {
  return SignatureAlgForKeyType[keyType]
}

export enum LIGHT_DID_SUPPORTED_SIGNING_KEY_TYPES {
  ed25519 = 'ed25519',
  sr25519 = 'sr25519',
}

const EncodingForSigningKeyType = {
  [LIGHT_DID_SUPPORTED_SIGNING_KEY_TYPES.sr25519]: '00',
  [LIGHT_DID_SUPPORTED_SIGNING_KEY_TYPES.ed25519]: '01',
}

const SigningKeyTypeFromEncoding = {
  '00': LIGHT_DID_SUPPORTED_SIGNING_KEY_TYPES.sr25519,
  '01': LIGHT_DID_SUPPORTED_SIGNING_KEY_TYPES.ed25519,
}

export function getEncodingForSigningKeyType(
  keyType: string
): string | undefined {
  return EncodingForSigningKeyType[keyType]
}

export function getSigningKeyTypeFromEncoding(
  encoding: string
): string | undefined {
  return SigningKeyTypeFromEncoding[encoding]?.toString()
}

function getLightDidFromIdentifier(identifier: string, didVersion = 1): string {
  const versionString = didVersion === 1 ? '' : `:v${didVersion}`
  return KILT_DID_PREFIX.concat(`light${versionString}:${identifier}`)
}

function getFullDidFromIdentifier(identifier: string, didVersion = 1): string {
  const versionString = didVersion === 1 ? '' : `v${didVersion}:`
  return KILT_DID_PREFIX.concat(`${versionString}${identifier}`)
}

export function getKiltDidFromIdentifier(
  identifier: string,
  didType: 'full' | 'light',
  didVersion = 1
): string {
  if (identifier.startsWith(KILT_DID_PREFIX)) {
    if (
      FULL_KILT_DID_REGEX.exec(identifier) ||
      LIGHT_KILT_DID_REGEX.exec(identifier)
    ) {
      return identifier
    }
    throw SDKErrors.ERROR_INVALID_DID_FORMAT
  }

  switch (didType) {
    case 'full':
      return getFullDidFromIdentifier(identifier, didVersion)
    case 'light':
      return getLightDidFromIdentifier(identifier, didVersion)
    default:
      throw SDKErrors.ERROR_UNSUPPORTED_DID(didType)
  }
}

export function parseDidUrl(didUrl: string): IDidParsingResult {
  let matches = FULL_KILT_DID_REGEX.exec(didUrl)?.groups
  if (matches && matches.identifier) {
    const version = matches.version ? parseInt(matches.version, 10) : 1
    return {
      did: getKiltDidFromIdentifier(matches.identifier, 'full', version),
      version,
      type: 'full',
      identifier: matches.identifier,
      fragment: matches.fragment?.substring(1),
    }
  }

  // If it fails to parse full DID, try with light DID
  matches = LIGHT_KILT_DID_REGEX.exec(didUrl)?.groups
  if (matches && matches.identifier && matches.auth_key_type) {
    const version = matches.version ? parseInt(matches.version, 10) : 1
    const lightDidIdentifier = matches.auth_key_type.concat(matches.identifier)
    return {
      did: getKiltDidFromIdentifier(lightDidIdentifier, 'light', version),
      version,
      type: 'light',
      identifier: matches.auth_key_type.concat(matches.identifier),
      fragment: matches.fragment?.substring(1),
      encodedDetails: matches.encoded_details?.substring(1),
    }
  }

  throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUrl)
}

export function getIdentifierFromKiltDid(did: string): string {
  return parseDidUrl(did).identifier
}

export function validateKiltDid(
  input: unknown,
  allowFragment = false
): input is IDidDetails['did'] {
  if (typeof input !== 'string') {
    throw TypeError(`DID string expected, got ${typeof input}`)
  }
  const { identifier, type, fragment } = parseDidUrl(input)
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

export function formatPublicKey(key: DidKey): PublicKeyEnum {
  const { type, publicKey } = key
  return { [type]: publicKey }
}


export type VerificationResult = {
  verified: boolean
  didDetails?: IDidDetails
  key?: DidKey
}

function verifyDidSignatureFromDetails({
  message,
  signature,
  keyId,
  keyRelationship,
  didDetails,
}: {
  message: string | Uint8Array
  signature: string | Uint8Array
  keyId: string
  didDetails: IDidDetails
  keyRelationship?: VerificationKeyRelationship
}): VerificationResult {
  const key = keyRelationship
    ? didDetails?.getKeys(keyRelationship).find((k) => k.id === keyId)
    : didDetails?.getKey(keyId)
  if (
    !key ||
    key.controller !== didDetails.did ||
    !SignatureAlgForKeyType[key.type]
  )
    return {
      verified: false,
      didDetails,
      key,
    }
  return {
    verified: Crypto.verify(message, signature, key.publicKeyHex),
    didDetails,
    key,
  }
}

// Verify a DID signature given the key ID of the signature.
// A signature verification returns false if a migrated and then deleted DID is used.
export async function verifyDidSignature({
  message,
  signature,
  keyId,
  keyRelationship,
  resolver = DefaultResolver,
}: {
  message: string | Uint8Array
  signature: string | Uint8Array
  keyId: DidKey['id']
  resolver?: IDidResolver
  keyRelationship?: VerificationKeyRelationship
}): Promise<VerificationResult> {
  // resolveDoc can accept a key ID, but it will always return the DID details.
  const resolutionDetails = await resolver.resolveDoc(keyId)
  // Verification fails if the DID does not exist at all.
  if (!resolutionDetails) {
    return {
      verified: false,
    }
  }
  // Verification also fails if the DID has been deleted.
  if (resolutionDetails.metadata.deactivated) {
    return {
      verified: false,
    }
  }
  // Verification also fails if the signer is a migrated light DID.
  if (resolutionDetails.metadata.canonicalId) {
    return {
      verified: false,
    }
  }
  // Otherwise, the details used are either the migrated full DID details or the light DID details.
  const didDetails = (
    resolutionDetails.metadata.canonicalId
      ? (await resolver.resolveDoc(resolutionDetails.metadata.canonicalId))
          ?.details
      : resolutionDetails.details
  ) as IDidDetails

  return verifyDidSignatureFromDetails({
    message,
    signature,
    keyId,
    keyRelationship,
    didDetails,
  })
}

// export async function getDidAuthenticationSignature(
//   toSign: Uint8Array | string,
//   did: DidDetails,
//   signer: KeystoreSigner
// ): Promise<DidSignature> {
//   const { keyId, signature } = await signWithDid(
//     toSign,
//     did,
//     signer,
//     KeyRelationship.authentication
//   )
//   return { keyId, signature: Crypto.u8aToHex(signature) }
// }

// export function assembleDidFragment(
//   didUri: IDidDetails['did'],
//   fragmentId: string
// ): string {
//   return `${didUri}#${fragmentId}`
// }
