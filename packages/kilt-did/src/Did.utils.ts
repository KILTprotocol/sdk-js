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
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { SDKErrors, Crypto } from '@kiltprotocol/utils'
import { isHex } from '@polkadot/util'
import type { Registry } from '@polkadot/types/types'
import { checkAddress, encodeAddress } from '@polkadot/util-crypto'
import { DefaultResolver } from './DidResolver/DefaultResolver'
import type {
  PublicKeyEnum,
  UrlEnum,
  IDidCreationOptions,
  IAuthorizeCallOptions,
  UrlEncodingJson,
  DidAuthorizedCallOperation,
  DidCreationDetails,
  DidPublicKey,
  INewPublicKey,
  PublicKeyRoleAssignment,
  EndpointData,
} from './types'
import { generateCreateTx } from './Did.chain'
import { signWithDid } from './DidDetails/utils'

export const KILT_DID_PREFIX = 'did:kilt:'
export const KILT_DID_REGEX = /^did:kilt:(?<identifier>[1-9a-km-zA-HJ-NP-Z]{48})(?<fragment>#.+)?$/

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

export function getKiltDidFromIdentifier(identifier: string): string {
  if (identifier.startsWith(KILT_DID_PREFIX)) {
    return identifier
  }
  return KILT_DID_PREFIX + identifier
}

export function getIdentifierFromKiltDid(did: string): string {
  if (!did.startsWith(KILT_DID_PREFIX)) {
    throw SDKErrors.ERROR_INVALID_DID_PREFIX(did)
  }
  return did.substr(KILT_DID_PREFIX.length)
}

export function getIdentifierFromDid(did: string): string {
  const secondColonAt = did.indexOf(':', did.indexOf(':') + 1)
  const identifier = did.substring(secondColonAt + 1)
  if (!identifier) {
    throw SDKErrors.ERROR_INVALID_DID_PREFIX(did)
  }
  return identifier
}

export function parseDidUrl(didUrl: string) {
  const { identifier, fragment } = didUrl.match(KILT_DID_REGEX)?.groups || {}
  if (!identifier) throw SDKErrors.ERROR_INVALID_DID_PREFIX(didUrl)
  return {
    did: getKiltDidFromIdentifier(identifier),
    identifier,
    fragment: fragment?.substr(1),
  }
}

export function validateKiltDid(
  input: unknown,
  allowFragment = false
): input is IDidDetails['did'] {
  if (typeof input !== 'string') {
    throw TypeError(`DID string expected, got ${typeof input}`)
  }
  const { identifier, did } = parseDidUrl(input)
  if (!allowFragment && did !== input) {
    throw new Error(
      `Expected DID of format kilt:did:<ss58 identifier>, got ${input}`
    )
  }
  if (!checkAddress(identifier, 38)[0]) {
    throw SDKErrors.ERROR_ADDRESS_INVALID(identifier, 'DID identifier')
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

export function encodeEndpointUrl(url: string): UrlEnum {
  const typedUrl: Record<string, UrlEncodingJson> = {}
  const matched = Array.from(['http', 'ftp', 'ipfs']).some((type) => {
    if (url.startsWith(type)) {
      typedUrl[type] = { payload: url }
      return true
    }
    return false
  })
  if (!matched)
    throw new Error(
      'only endpoint urls starting with http/https, ftp, and ipfs are accepted'
    )
  return typedUrl as UrlEnum
}

export function encodeDidCreationOperation(
  registry: Registry,
  { didIdentifier, keys = {}, endpointData }: IDidCreationOptions
): DidCreationDetails {
  const {
    [KeyRelationship.assertionMethod]: assertionMethodKey,
    [KeyRelationship.capabilityDelegation]: delegationKey,
    [KeyRelationship.keyAgreement]: encryptionKey,
  } = keys
  // build did create object
  const didCreateRaw = {
    did: didIdentifier,
    newKeyAgreementKeys: encryptionKey ? [formatPublicKey(encryptionKey)] : [],
    newAssertionMethodKey: assertionMethodKey
      ? formatPublicKey(assertionMethodKey)
      : undefined,
    newCapabilityDelegationKey: delegationKey
      ? formatPublicKey(delegationKey)
      : undefined,
    newServiceEndpoints: endpointData
      ? {
          ...endpointData,
          urls: endpointData.urls.map((url) => encodeEndpointUrl(url)),
        }
      : undefined,
  }
  return new (registry.getOrThrow<DidCreationDetails>('DidCreationDetails'))(
    registry,
    didCreateRaw
  )
}

export function encodeDidAuthorizedCallOperation(
  registry: Registry,
  { didIdentifier, txCounter, call }: IAuthorizeCallOptions
): DidAuthorizedCallOperation {
  return new (registry.getOrThrow<DidAuthorizedCallOperation>(
    'DidAuthorizedCallOperation'
  ))(registry, {
    did: didIdentifier,
    txCounter,
    call,
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
  return new (registry.getOrThrow<DidPublicKey>('DidPublicKey'))(registry, {
    [keyClass]: formatPublicKey(key),
  })
}

export function computeKeyId(publicKey: DidPublicKey): string {
  return Crypto.hashStr(publicKey.toU8a())
}

export type VerficationResult = {
  verified: boolean
  didDetails?: IDidDetails
  key?: IDidKeyDetails
}

export function verifyDidSignature({
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
}): VerficationResult {
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

export async function verifyDidSignatureAsync({
  message,
  signature,
  keyId,
  keyRelationship,
  resolver = DefaultResolver,
  didDetails,
}: {
  message: string | Uint8Array
  signature: string | Uint8Array
  keyId: string
  resolver?: IDidResolver
  didDetails?: IDidDetails
  keyRelationship?: VerificationKeyRelationship
}): Promise<VerficationResult> {
  let didOrNot: IDidDetails | undefined | null
  if (!didDetails) {
    if (!(typeof resolver?.resolve === 'function'))
      throw new Error(
        'Either the claimer DidDetails or a DID resolver is required for verification'
      )
    didOrNot = await resolver.resolveDoc(keyId)
  } else {
    didOrNot = didDetails
  }
  if (didOrNot) {
    return verifyDidSignature({
      message,
      signature,
      keyId,
      keyRelationship,
      didDetails: didOrNot,
    })
  }
  return {
    verified: false,
  }
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

export async function writeDidfromPublicKeys(
  signer: KeystoreSigner,
  publicKeys: PublicKeyRoleAssignment,
  endpointData?: EndpointData
): Promise<{ submittable: SubmittableExtrinsic; did: string }> {
  const { [KeyRelationship.authentication]: authenticationKey } = publicKeys
  if (!authenticationKey)
    throw Error(`${KeyRelationship.authentication} key is required`)
  const didIdentifier = encodeAddress(authenticationKey.publicKey, 38)
  const submittable = await generateCreateTx({
    signer,
    didIdentifier,
    keys: publicKeys,
    alg: getSignatureAlgForKeyType(authenticationKey.type),
    signingPublicKey: authenticationKey.publicKey,
    endpointData,
  })
  return { submittable, did: getKiltDidFromIdentifier(didIdentifier) }
}

export function writeDidfromIdentity(
  identity: IIdentity
): Promise<{ submittable: SubmittableExtrinsic; did: string }> {
  const { signKeyringPair } = identity
  const signer: KeystoreSigner = {
    sign: ({ data }) =>
      Promise.resolve({
        data: signKeyringPair.sign(data),
        alg: getSignatureAlgForKeyType(signKeyringPair.type) as any,
      }),
  }
  return writeDidfromPublicKeys(signer, {
    [KeyRelationship.authentication]: signKeyringPair,
    [KeyRelationship.keyAgreement]: { ...identity.boxKeyPair, type: 'x25519' },
  })
}
