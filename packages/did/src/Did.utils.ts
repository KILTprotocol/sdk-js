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
  IIdentity,
  IDidKeyDetails,
  KeystoreSigner,
  SubmittableExtrinsic,
  VerificationKeyRelationship,
  IDidServiceEndpoint,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { SDKErrors, Crypto } from '@kiltprotocol/utils'
import { hexToU8a, isHex } from '@polkadot/util'
import type { Registry } from '@polkadot/types/types'
import { checkAddress, encodeAddress } from '@polkadot/util-crypto'
import { DefaultResolver } from './DidResolver/DefaultResolver.js'
import type {
  PublicKeyEnum,
  IDidCreationOptions,
  IAuthorizeCallOptions,
  DidAuthorizedCallOperation,
  DidCreationDetails,
  DidPublicKey,
  INewPublicKey,
  PublicKeyRoleAssignment,
  IDidParsingResult,
  IServiceEndpointChainRecordCodec,
} from './types'
import { generateCreateTx } from './Did.chain.js'
import { LightDidDetails } from './DidDetails/index.js'

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

export function getSignatureAlgForKeyType(keyType: string): string {
  return SignatureAlgForKeyType[keyType] || keyType
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

export function getEncodingForSigningKeyType(keyType: string): string {
  return EncodingForSigningKeyType[keyType] || null
}

export function getSigningKeyTypeFromEncoding(encoding: string): string {
  return SigningKeyTypeFromEncoding[encoding]?.toString() || null
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

export function validateDidSignature(input: unknown): input is DidSignature {
  try {
    if (
      !isHex((input as DidSignature).signature) ||
      !validateKiltDid((input as DidSignature).keyId, true)
    ) {
      throw SDKErrors.ERROR_SIGNATURE_DATA_TYPE()
    }
    return true
  } catch (e) {
    throw SDKErrors.ERROR_SIGNATURE_DATA_TYPE()
  }
}

export function formatPublicKey(keypair: INewPublicKey): PublicKeyEnum {
  const { type, publicKey } = keypair
  return { [type]: publicKey }
}

export function isINewPublicKey(key: unknown): key is INewPublicKey {
  if (typeof key === 'object') {
    const { publicKey, type } = key as INewPublicKey
    return publicKey instanceof Uint8Array && typeof type === 'string'
  }
  return false
}

export function encodeDidCreationOperation(
  registry: Registry,
  { didIdentifier, submitter, keys = {}, endpoints = [] }: IDidCreationOptions
): DidCreationDetails {
  const {
    [KeyRelationship.assertionMethod]: assertionMethodKey,
    [KeyRelationship.capabilityDelegation]: delegationKey,
    [KeyRelationship.keyAgreement]: encryptionKey,
  } = keys
  // build did create object
  const didCreateRaw = {
    did: didIdentifier,
    submitter,
    newKeyAgreementKeys: encryptionKey ? [formatPublicKey(encryptionKey)] : [],
    newAttestationKey: assertionMethodKey
      ? formatPublicKey(assertionMethodKey)
      : undefined,
    newDelegationKey: delegationKey
      ? formatPublicKey(delegationKey)
      : undefined,
    newServiceDetails: endpoints.map((service) => {
      const { id, urls } = service
      return { id, urls, serviceTypes: service.types }
    }),
  }
  return new (registry.getOrThrow<DidCreationDetails>(
    'DidDidDetailsDidCreationDetails'
  ))(registry, didCreateRaw)
}

export function encodeDidAuthorizedCallOperation(
  registry: Registry,
  {
    didIdentifier,
    txCounter,
    call,
    submitter,
    blockNumber,
  }: IAuthorizeCallOptions
): DidAuthorizedCallOperation {
  return new (registry.getOrThrow<DidAuthorizedCallOperation>(
    'DidDidDetailsDidAuthorizedCallOperation'
  ))(registry, {
    did: didIdentifier,
    txCounter,
    call,
    blockNumber,
    submitter,
  })
}

export function encodeServiceEndpoint(
  registry: Registry,
  endpoint: IDidServiceEndpoint
): IServiceEndpointChainRecordCodec {
  return new (registry.getOrThrow<IServiceEndpointChainRecordCodec>(
    'DidServiceEndpointsDidEndpoint'
  ))(registry, {
    id: endpoint.id,
    serviceTypes: endpoint.types,
    urls: endpoint.urls,
  })
}

export function encodeDidPublicKey(
  registry: Registry,
  key: INewPublicKey
): DidPublicKey {
  let keyClass: string
  if (
    (Object.values(CHAIN_SUPPORTED_SIGNATURE_KEY_TYPES) as string[]).includes(
      key.type
    )
  ) {
    keyClass = 'PublicVerificationKey'
  } else if (
    (Object.values(CHAIN_SUPPORTED_ENCRYPTION_KEY_TYPES) as string[]).includes(
      key.type
    )
  ) {
    keyClass = 'PublicEncryptionKey'
  } else {
    throw TypeError(
      `Unsupported key type; types currently recognized are ${Object.values(
        CHAIN_SUPPORTED_KEY_TYPES
      )}`
    )
  }
  return new (registry.getOrThrow<DidPublicKey>('DidDidDetailsDidPublicKey'))(
    registry,
    {
      [keyClass]: formatPublicKey(key),
    }
  )
}

export function computeKeyId(publicKey: DidPublicKey): string {
  return Crypto.hashStr(publicKey.toU8a())
}

export type VerificationResult = {
  verified: boolean
  didDetails?: IDidDetails
  key?: IDidKeyDetails
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
  keyId: IDidKeyDetails['id']
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

export async function writeDidFromPublicKeys(
  signer: KeystoreSigner,
  submitter: IIdentity['address'],
  publicKeys: PublicKeyRoleAssignment
): Promise<{ extrinsic: SubmittableExtrinsic; did: string }> {
  const { [KeyRelationship.authentication]: authenticationKey } = publicKeys
  if (!authenticationKey)
    throw Error(`${KeyRelationship.authentication} key is required`)
  const didIdentifier = encodeAddress(authenticationKey.publicKey, 38)
  const extrinsic = await generateCreateTx({
    signer,
    submitter,
    didIdentifier,
    keys: publicKeys,
    alg: getSignatureAlgForKeyType(authenticationKey.type),
    signingPublicKey: authenticationKey.publicKey,
  })
  const did = getKiltDidFromIdentifier(didIdentifier, 'full')
  return { extrinsic, did }
}

export async function writeDidFromPublicKeysAndServices(
  signer: KeystoreSigner,
  submitter: IIdentity['address'],
  publicKeys: PublicKeyRoleAssignment,
  endpoints: IDidServiceEndpoint[]
): Promise<{ extrinsic: SubmittableExtrinsic; did: string }> {
  const { [KeyRelationship.authentication]: authenticationKey } = publicKeys
  if (!authenticationKey)
    throw Error(`${KeyRelationship.authentication} key is required`)
  const didIdentifier = encodeAddress(authenticationKey.publicKey, 38)
  const extrinsic = await generateCreateTx({
    signer,
    submitter,
    didIdentifier,
    keys: publicKeys,
    alg: getSignatureAlgForKeyType(authenticationKey.type),
    signingPublicKey: authenticationKey.publicKey,
    endpoints,
  })
  const did = getKiltDidFromIdentifier(didIdentifier, 'full')
  return { extrinsic, did }
}

export function writeDidFromIdentity(
  identity: IIdentity,
  submitter: IIdentity['address']
): Promise<{ extrinsic: SubmittableExtrinsic; did: string }> {
  const { signKeyringPair } = identity
  const signer: KeystoreSigner = {
    sign: ({ data }) =>
      Promise.resolve({
        data: signKeyringPair.sign(data),
        alg: getSignatureAlgForKeyType(signKeyringPair.type) as any,
      }),
  }
  return writeDidFromPublicKeys(signer, submitter, {
    [KeyRelationship.authentication]: signKeyringPair,
    [KeyRelationship.keyAgreement]: { ...identity.boxKeyPair, type: 'x25519' },
  })
}

export async function signWithKey(
  toSign: Uint8Array | string,
  key: IDidKeyDetails,
  signer: KeystoreSigner
): Promise<{ keyId: string; alg: string; signature: Uint8Array }> {
  const alg = getSignatureAlgForKeyType(key.type)
  const { data: signature } = await signer.sign({
    publicKey: Crypto.coToUInt8(key.publicKeyHex),
    alg,
    data: Crypto.coToUInt8(toSign),
  })
  return { keyId: key.id, signature, alg }
}

export async function signWithDid(
  toSign: Uint8Array | string,
  did: IDidDetails,
  signer: KeystoreSigner,
  whichKey: KeyRelationship | IDidKeyDetails['id']
): Promise<{ keyId: string; alg: string; signature: Uint8Array }> {
  let key: IDidKeyDetails | undefined
  if (Object.values(KeyRelationship).includes(whichKey as KeyRelationship)) {
    // eslint-disable-next-line prefer-destructuring
    key = did.getKeys(KeyRelationship.authentication)[0]
  } else {
    key = did.getKey(whichKey)
  }
  if (!key) {
    throw Error(
      `failed to find key on FullDidDetails (${did.did}): ${whichKey}`
    )
  }
  return signWithKey(toSign, key, signer)
}

export async function getDidAuthenticationSignature(
  toSign: Uint8Array | string,
  did: IDidDetails,
  signer: KeystoreSigner
): Promise<DidSignature> {
  const { keyId, signature } = await signWithDid(
    toSign,
    did,
    signer,
    KeyRelationship.authentication
  )
  return { keyId, signature: Crypto.u8aToHex(signature) }
}

export function assembleDidFragment(
  didUri: IDidDetails['did'],
  fragmentId: string
): string {
  return `${didUri}#${fragmentId}`
}

// This function is tested in the DID integration tests, in the `DID migration` test case.
export async function upgradeDid(
  lightDid: LightDidDetails,
  submitter: IIdentity['address'],
  signer: KeystoreSigner
): Promise<{ extrinsic: SubmittableExtrinsic; did: string }> {
  const didAuthenticationKey = lightDid.getKeys(
    KeyRelationship.authentication
  )[0]
  const didEncryptionKey = lightDid.getKeys(KeyRelationship.keyAgreement)[0]

  const newDidPublicKeys: PublicKeyRoleAssignment = {
    authentication: {
      publicKey: hexToU8a(didAuthenticationKey.publicKeyHex),
      type: didAuthenticationKey.type,
    },
  }
  if (didEncryptionKey) {
    newDidPublicKeys.keyAgreement = {
      publicKey: hexToU8a(didEncryptionKey.publicKeyHex),
      type: didEncryptionKey.type,
    }
  }

  const adjustedServiceEndpoints = lightDid.getEndpoints().map((service) => {
    // We are sure a fragment exists.
    const id = parseDidUrl(service.id).fragment as string
    // We remove the service ID prefix (did:light:...) before writing it on chain.
    return { ...service, id }
  })

  return writeDidFromPublicKeysAndServices(
    signer,
    submitter,
    newDidPublicKeys,
    adjustedServiceEndpoints
  )
}
