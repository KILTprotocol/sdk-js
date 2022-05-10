/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { checkAddress } from '@polkadot/util-crypto'
import { isHex, u8aToHex } from '@polkadot/util'

import {
  DidKey,
  DidPublicKey,
  DidSignature,
  DidVerificationKey,
  EncryptionKeyType,
  IDidDetails,
  DidIdentifier,
  IDidResolver,
  NewDidKey,
  VerificationKeyRelationship,
  VerificationKeyType,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { DidResolver } from './DidResolver/index.js'
import {
  EncryptionAlgorithms,
  SigningAlgorithms,
} from './DemoKeystore/DemoKeystore.js'

/// The latest version for KILT light DIDs.
export const LIGHT_DID_LATEST_VERSION = 1

/// The latest version for KILT full DIDs.
export const FULL_DID_LATEST_VERSION = 1

const KILT_DID_PREFIX = 'did:kilt:'

// NOTICE: The following regex patterns must be kept in sync with DidUri type in @kiltprotocol/types

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

export const defaultKeySelectionCallback = <T>(keys: T[]): Promise<T | null> =>
  Promise.resolve(keys[0] || null)

/**
 * Compiles a KILT DID uri for a full or light DID from a unique identifier and associated data.
 *
 * @param identifier A ss58 encoded address valid on the KILT network.
 * @param didType 'full' to produce a FullDid's uri, 'light' for a LightDid.
 * @param version KILT DID specification version number.
 * @param encodedDetails When compiling a LightDid uri, encoded DidDetails can be appeneded to the end of the uri.
 * @returns A DID uri as a string.
 */
export function getKiltDidFromIdentifier(
  identifier: DidIdentifier,
  didType: 'full' | 'light',
  version?: number,
  encodedDetails?: string
): IDidDetails['uri'] {
  const typeString = didType === 'full' ? '' : `light:`
  let versionValue = version
  // If no version is specified, take the default one depending on the requested DID type.
  if (!versionValue) {
    versionValue =
      didType === 'full' ? FULL_DID_LATEST_VERSION : LIGHT_DID_LATEST_VERSION
  }
  const versionString = versionValue === 1 ? '' : `v${version}:`
  const encodedDetailsString = encodedDetails ? `:${encodedDetails}` : ''
  return `${KILT_DID_PREFIX}${typeString}${versionString}${identifier}${encodedDetailsString}`
}

export type IDidParsingResult = {
  did: IDidDetails['uri']
  version: number
  type: 'light' | 'full'
  identifier: DidIdentifier
  fragment?: string
  authKeyTypeEncoding?: string
  encodedDetails?: string
}

/**
 * Parses a KILT DID uri and returns the information contained within in a structured form.
 *
 * @param didUri A KILT DID uri as a string.
 * @returns Object containing information extracted from the DID uri.
 */
export function parseDidUri(didUri: IDidDetails['uri']): IDidParsingResult {
  let matches = FULL_KILT_DID_REGEX.exec(didUri)?.groups
  if (matches && matches.identifier) {
    const version = matches.version
      ? parseInt(matches.version, 10)
      : FULL_DID_LATEST_VERSION
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
    const encodedDetails = matches.encoded_details?.substring(1)
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
      encodedDetails,
    }
  }

  throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
}

/**
 * Parses a KILT DID uri and returns its unique identifier.
 *
 * @param didUri A KILT DID uri as a string.
 * @returns The identifier contained within the DID uri.
 */
export function getIdentifierFromKiltDid(
  didUri: IDidDetails['uri']
): DidIdentifier {
  return parseDidUri(didUri).identifier
}

/**
 * Returns true if both didA and didB refer to the same DID subject, i.e., whether they have the same identifier as specified in the method spec.
 *
 * @param didA A KILT DID uri as a string.
 * @param didB A second KILT DID uri as a string.
 * @returns Whether didA and didB refer to the same DID subject.
 */
export function isSameSubject(
  didA: IDidDetails['uri'],
  didB: IDidDetails['uri']
): boolean {
  // eslint-disable-next-line prefer-const
  let { identifier: identifierA, type: typeA } = parseDidUri(didA)
  // eslint-disable-next-line prefer-const
  let { identifier: identifierB, type: typeB } = parseDidUri(didB)
  // Skip key encoding part
  if (typeA === 'light') {
    identifierA = identifierA.substring(2)
  }
  if (typeB === 'light') {
    identifierB = identifierB.substring(2)
  }
  return identifierA === identifierB
}

const signatureAlgForKeyType: Record<VerificationKeyType, SigningAlgorithms> = {
  [VerificationKeyType.Ed25519]: SigningAlgorithms.Ed25519,
  [VerificationKeyType.Sr25519]: SigningAlgorithms.Sr25519,
  [VerificationKeyType.Ecdsa]: SigningAlgorithms.EcdsaSecp256k1,
}
const keyTypeForSignatureAlg = Object.entries(signatureAlgForKeyType).reduce(
  (obj, [key, value]) => {
    return { ...obj, [value]: key }
  },
  {}
) as Record<SigningAlgorithms, VerificationKeyType>

/**
 * Given the identifier of a key type, returns the identifier of the signature algorithm for which it is used.
 *
 * @param keyType Key type identifier.
 * @returns Signing algorithm identifier.
 */
export function getSigningAlgorithmForVerificationKeyType(
  keyType: VerificationKeyType
): SigningAlgorithms {
  return signatureAlgForKeyType[keyType]
}

/**
 * Given the identifier of a signature algorithm, returns the identifier of the key type required for it.
 *
 * @param signatureAlg Signature algorithm identifier.
 * @returns Key type identifier.
 */
export function getVerificationKeyTypeForSigningAlgorithm(
  signatureAlg: SigningAlgorithms
): VerificationKeyType {
  return keyTypeForSignatureAlg[signatureAlg]
}

const encryptionAlgForKeyType: Record<EncryptionKeyType, EncryptionAlgorithms> =
  {
    [EncryptionKeyType.X25519]: EncryptionAlgorithms.NaclBox,
  }
/**
 * Given the identifier of a key type, returns the identifier of the encryption algorithm for which it is used.
 *
 * @param keyType Key type identifier.
 * @returns Encryption algorithm indentifier.
 */
export function getEncryptionAlgorithmForEncryptionKeyType(
  keyType: EncryptionKeyType
): EncryptionAlgorithms {
  return encryptionAlgForKeyType[keyType]
}
const keyTypeForEncryptionAlg: Record<EncryptionAlgorithms, EncryptionKeyType> =
  {
    [EncryptionAlgorithms.NaclBox]: EncryptionKeyType.X25519,
  }
/**
 * Given the identifier of an encryption algorithm, returns the identifier of the key type required for it.
 *
 * @param encryptionAlg Encryption algorithm identifier.
 * @returns Key type identifier.
 */
export function getEncryptionKeyTypeForEncryptionAlgorithm(
  encryptionAlg: EncryptionAlgorithms
): EncryptionKeyType {
  return keyTypeForEncryptionAlg[encryptionAlg]
}

/**
 * Checks whether a DidKey is a verification key.
 *
 * @param key Representation of a DID key.
 * @returns True if the key is a verification key, false otherwise.
 */
export function isVerificationKey(key: NewDidKey | DidKey): boolean {
  return Object.values(VerificationKeyType).some((kt) => kt === key.type)
}

/**
 * Checks whether a DidKey is an encryption key.
 *
 * @param key Representation of a DID key.
 * @returns True if the key is a encryption key, false otherwise.
 */
export function isEncryptionKey(key: NewDidKey | DidKey): boolean {
  return Object.values(EncryptionKeyType).some((kt) => kt === key.type)
}

/**
 * Type guard assuring that a string (or other input) is a valid KILT DID uri.
 *
 * @param input Arbitrary input.
 * @param allowFragment Whether the uri is allowed to have a fragment (following '#').
 * @returns True if validation has passed.
 * @throws [[SDKError]] if validation fails.
 */
export function validateKiltDidUri(
  input: unknown,
  allowFragment = false
): input is IDidDetails['uri'] {
  if (typeof input !== 'string') {
    throw TypeError(`DID string expected, got ${typeof input}`)
  }
  const { identifier, type, fragment } = parseDidUri(
    input as IDidDetails['uri']
  )
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

/**
 * Type guard assuring that a the input is a valid DidSignature object, consisting of a signature as hex and the uri of the signing key.
 * Does not cryptographically verify the signature itself!
 *
 * @param input Arbitrary input.
 * @returns True if validation of form has passed.
 * @throws [[SDKError]] if validation fails.
 */
export function validateDidSignature(input: unknown): input is DidSignature {
  const signature = input as DidSignature
  try {
    if (
      !isHex(signature.signature) ||
      !validateKiltDidUri(signature.keyUri, true)
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
  keyId: DidVerificationKey['id']
  expectedVerificationMethod?: VerificationKeyRelationship
  details: IDidDetails
}

export type VerificationResult = {
  verified: boolean
  reason?: string
  didDetails?: IDidDetails
  key?: DidVerificationKey
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
      reason: `No key with ID ${keyId} for the DID ${details.uri}`,
    }
  }
  // Check whether the provided key ID is within the keys for a given verification relationship, if provided.
  if (
    expectedVerificationMethod &&
    !details
      .getVerificationKeys(expectedVerificationMethod)
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
    key: key as DidVerificationKey,
  }
}

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: DidSignature
  expectedVerificationMethod?: VerificationKeyRelationship
  resolver?: IDidResolver
}

/**
 * Verify a DID signature given the key URI of the signature.
 * A signature verification returns false if a migrated and then deleted DID is used.
 *
 * @param input Object wrapping all input.
 * @param input.message The message that was signed.
 * @param input.signature An object containing signature and signer key.
 * @param input.expectedVerificationMethod Which relationship to the signer DID the key must have.
 * @param input.resolver Allows specifying a custom DID resolver. Defaults to the built-in [[DidResolver]].
 * @returns Object indicating verification result and optionally reason for failure.
 */
export async function verifyDidSignature({
  message,
  signature,
  expectedVerificationMethod,
  resolver = DidResolver,
}: DidSignatureVerificationInput): Promise<VerificationResult> {
  // Verification fails if the signature key ID is not valid
  const { fragment: keyId } = parseDidUri(signature.keyUri)
  if (!keyId) {
    return {
      verified: false,
      reason: `Signature key ID ${signature.keyUri} invalid.`,
    }
  }
  const resolutionDetails = await resolver.resolveDoc(signature.keyUri)
  // Verification fails if the DID does not exist at all.
  if (!resolutionDetails) {
    return {
      verified: false,
      reason: `No result for provided key ID ${signature.keyUri}`,
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
    keyId,
    expectedVerificationMethod,
    details,
  })
}

/**
 * Compute the full key URI (did:kilt:<identifier>#<key_id> for a given DID key <key_id>.
 *
 * @param did The DID URI, with no trailing fragment (i.e., no "#" symbol).
 * @param keyId The key ID, without the leading subject's DID prefix.
 *
 * @returns The full public key URI, which includes the subject's DID and the provided key ID.
 */
export function assembleKeyUri(
  did: IDidDetails['uri'],
  keyId: DidKey['id']
): DidPublicKey['uri'] {
  if (parseDidUri(did).fragment) {
    throw SDKErrors.ERROR_DID_ERROR(
      `Cannot assemble key URI from a DID that already has a fragment: ${did}`
    )
  }
  return `${did}#${keyId}`
}
