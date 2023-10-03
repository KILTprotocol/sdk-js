/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option } from '@polkadot/types'
import type { AccountId32, Extrinsic, Hash } from '@polkadot/types/interfaces'
import type { AnyNumber } from '@polkadot/types/types'

import type {
  DidDidDetails,
  DidDidDetailsDidAuthorizedCallOperation,
  DidDidDetailsDidPublicKeyDetails,
  DidServiceEndpointsDidEndpoint,
  KiltSupportDeposit,
} from '@kiltprotocol/augment-api'

import {
  BN,
  CryptoCallbacksV2,
  Deposit,
  DidDocumentV2,
  encryptionKeyTypesMap,
  KiltAddress,
  NewDidEncryptionKey,
  NewDidVerificationKey,
  SubmittableExtrinsic,
  verificationKeyTypesMap,
} from '@kiltprotocol/types'

import { ConfigService } from '@kiltprotocol/config'
import { Crypto, SDKErrors, ss58Format } from '@kiltprotocol/utils'

import {
  DidEncryptionKeyType,
  NewService,
  DidVerificationKeyType,
  verificationKeyTypes,
} from './DidDetailsv2/DidDetailsV2.js'

import {
  multibaseKeyToDidKey,
  keypairToMultibaseKey,
  getAddressFromVerificationMethod,
  getFullDidUri,
  parse,
} from './Did2.utils.js'

export type ChainDidIdentifier = KiltAddress

export type EncodedVerificationKey =
  | { sr25519: Uint8Array }
  | { ed25519: Uint8Array }
  | { ecdsa: Uint8Array }
export type EncodedEncryptionKey = { x25519: Uint8Array }
export type EncodedDidKey = EncodedVerificationKey | EncodedEncryptionKey
export type EncodedSignature = EncodedVerificationKey

/**
 * @param did
 */
export function toChain(did: DidDocumentV2.DidUri): ChainDidIdentifier {
  return parse(did).address
}

/**
 * @param id
 */
export function fragmentIdToChain(id: DidDocumentV2.UriFragment): string {
  return id.replace(/^#/, '')
}

/**
 * @param encoded
 */
export function fromChain(encoded: AccountId32): DidDocumentV2.DidUri {
  return getFullDidUri(Crypto.encodeAddress(encoded, ss58Format))
}

/**
 * @param deposit
 */
export function depositFromChain(deposit: KiltSupportDeposit): Deposit {
  return {
    owner: Crypto.encodeAddress(deposit.owner, ss58Format),
    amount: deposit.amount.toBn(),
  }
}

export type ChainDidBaseKey = {
  id: DidDocumentV2.UriFragment
  publicKey: Uint8Array
  includedAt?: BN
  type: string
}
export type ChainDidVerificationKey = ChainDidBaseKey & {
  type: DidVerificationKeyType
}
export type ChainDidEncryptionKey = ChainDidBaseKey & {
  type: DidEncryptionKeyType
}
export type ChainDidKey = ChainDidVerificationKey | ChainDidEncryptionKey
export type ChainDidService = {
  id: string
  serviceTypes: string[]
  urls: string[]
}
export type ChainDidDetails = {
  authentication: [ChainDidVerificationKey]
  assertionMethod?: [ChainDidVerificationKey]
  capabilityDelegation?: [ChainDidVerificationKey]
  keyAgreement?: ChainDidEncryptionKey[]

  service?: ChainDidService[]

  lastTxCounter: BN
  deposit: Deposit
}

function publicKeyFromChain(
  keyId: Hash,
  keyDetails: DidDidDetailsDidPublicKeyDetails
): ChainDidKey {
  const key = keyDetails.key.isPublicEncryptionKey
    ? keyDetails.key.asPublicEncryptionKey
    : keyDetails.key.asPublicVerificationKey
  return {
    id: `#${keyId.toHex()}`,
    publicKey: key.value.toU8a(),
    type: key.type.toLowerCase() as
      | ChainDidVerificationKey['type']
      | ChainDidEncryptionKey['type'],
  }
}

/**
 * @param encoded
 */
export function documentFromChain(
  encoded: Option<DidDidDetails>
): ChainDidDetails {
  const {
    publicKeys,
    authenticationKey,
    attestationKey,
    delegationKey,
    keyAgreementKeys,
    lastTxCounter,
    deposit,
  } = encoded.unwrap()

  const keys: Record<string, ChainDidKey> = [...publicKeys.entries()]
    .map(([keyId, keyDetails]) => publicKeyFromChain(keyId, keyDetails))
    .reduce((res, key) => {
      res[fragmentIdToChain(key.id)] = key
      return res
    }, {})

  const authentication = keys[
    authenticationKey.toHex()
  ] as ChainDidVerificationKey

  const didRecord: ChainDidDetails = {
    authentication: [authentication],
    lastTxCounter: lastTxCounter.toBn(),
    deposit: depositFromChain(deposit),
  }
  if (attestationKey.isSome) {
    const key = keys[attestationKey.unwrap().toHex()] as ChainDidVerificationKey
    didRecord.assertionMethod = [key]
  }
  if (delegationKey.isSome) {
    const key = keys[delegationKey.unwrap().toHex()] as ChainDidVerificationKey
    didRecord.capabilityDelegation = [key]
  }

  const keyAgreementKeyIds = [...keyAgreementKeys.values()].map((keyId) =>
    keyId.toHex()
  )
  if (keyAgreementKeyIds.length > 0) {
    didRecord.keyAgreement = keyAgreementKeyIds.map(
      (id) => keys[id] as ChainDidEncryptionKey
    )
  }

  return didRecord
}

export function publicKeyToChain(
  key: NewDidVerificationKey
): EncodedVerificationKey
export function publicKeyToChain(key: NewDidEncryptionKey): EncodedEncryptionKey

/**
 * Transforms a DID public key record to an enum-type key-value pair required in many key-related extrinsics.
 *
 * @param key Object describing data associated with a public key.
 * @returns Data restructured to allow SCALE encoding by polkadot api.
 */
export function publicKeyToChain(
  key: NewDidVerificationKey | NewDidEncryptionKey
): EncodedDidKey {
  // TypeScript can't infer type here, so we have to add a type assertion.
  return { [key.type]: key.publicKey } as EncodedDidKey
}

function isUri(str: string): boolean {
  try {
    const url = new URL(str) // this actually accepts any URI but throws if it can't be parsed
    return url.href === str || encodeURI(decodeURI(str)) === str // make sure our URI has not been converted implicitly by URL
  } catch {
    return false
  }
}

const uriFragmentRegex = /^[a-zA-Z0-9._~%+,;=*()'&$!@:/?-]+$/

function isUriFragment(str: string): boolean {
  try {
    return uriFragmentRegex.test(str) && !!decodeURIComponent(str)
  } catch {
    return false
  }
}

/**
 * @param endpoint
 */
export function validateNewService(endpoint: NewService): void {
  const { id, serviceEndpoint } = endpoint
  if ((id as string).startsWith('did:kilt')) {
    throw new SDKErrors.DidError(
      `This function requires only the URI fragment part (following '#') of the service ID, not the full DID URI, which is violated by id "${id}"`
    )
  }
  if (!isUriFragment(fragmentIdToChain(id))) {
    throw new SDKErrors.DidError(
      `The service ID must be valid as a URI fragment according to RFC#3986, which "${id}" is not. Make sure not to use disallowed characters (e.g. whitespace) or consider URL-encoding the desired id.`
    )
  }
  serviceEndpoint.forEach((uri) => {
    if (!isUri(uri)) {
      throw new SDKErrors.DidError(
        `A service URI must be a URI according to RFC#3986, which "${uri}" (service id "${id}") is not. Make sure not to use disallowed characters (e.g. whitespace) or consider URL-encoding resource locators beforehand.`
      )
    }
  })
}

/**
 * @param service
 */
export function serviceToChain(service: NewService): ChainDidService {
  validateNewService(service)
  const { id, type, serviceEndpoint } = service
  return {
    id: fragmentIdToChain(id),
    serviceTypes: type,
    urls: serviceEndpoint,
  }
}

/**
 * @param encoded
 */
export function serviceFromChain(
  encoded: Option<DidServiceEndpointsDidEndpoint>
): NewService {
  const { id, serviceTypes, urls } = encoded.unwrap()
  return {
    id: `#${id.toUtf8()}`,
    type: serviceTypes.map((type) => type.toUtf8()),
    serviceEndpoint: urls.map((url) => url.toUtf8()),
  }
}

export type AuthorizeCallInput = {
  did: DidDocumentV2.DidUri
  txCounter: AnyNumber
  call: Extrinsic
  submitter: KiltAddress
  blockNumber?: AnyNumber
}

interface GetStoreTxInput {
  authentication: [NewDidVerificationKey]
  assertionMethod?: [NewDidVerificationKey]
  capabilityDelegation?: [NewDidVerificationKey]
  keyAgreement?: NewDidEncryptionKey[]

  service?: NewService[]
}

export type GetStoreTxSignCallback = (
  signData: Omit<CryptoCallbacksV2.SignRequestData, 'did'>
) => Promise<CryptoCallbacksV2.SignResponseData>

/**
 * @param input
 * @param submitter
 * @param sign
 */
export async function getStoreTxFromInput(
  input: GetStoreTxInput,
  submitter: KiltAddress,
  sign: GetStoreTxSignCallback
): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')

  const {
    authentication,
    assertionMethod,
    capabilityDelegation,
    keyAgreement = [],
    service = [],
  } = input

  if (!('authentication' in input) || typeof authentication[0] !== 'object') {
    throw new SDKErrors.DidError(
      `The provided DID does not have an authentication key to sign the creation operation`
    )
  }

  // For now, it only takes the first attestation key, if present.
  if (assertionMethod !== undefined && assertionMethod.length > 1) {
    throw new SDKErrors.DidError(
      `More than one attestation key (${assertionMethod.length}) specified. The chain can only store one.`
    )
  }

  // For now, it only takes the first delegation key, if present.
  if (capabilityDelegation !== undefined && capabilityDelegation.length > 1) {
    throw new SDKErrors.DidError(
      `More than one delegation key (${capabilityDelegation.length}) specified. The chain can only store one.`
    )
  }

  const maxKeyAgreementKeys = api.consts.did.maxNewKeyAgreementKeys.toNumber()
  if (keyAgreement.length > maxKeyAgreementKeys) {
    throw new SDKErrors.DidError(
      `The number of key agreement keys in the creation operation is greater than the maximum allowed, which is ${maxKeyAgreementKeys}`
    )
  }

  const maxNumberOfServicesPerDid =
    api.consts.did.maxNumberOfServicesPerDid.toNumber()
  if (service.length > maxNumberOfServicesPerDid) {
    throw new SDKErrors.DidError(
      `Cannot store more than ${maxNumberOfServicesPerDid} service endpoints per DID`
    )
  }

  const [authenticationKey] = authentication
  const did = getAddressFromVerificationMethod({
    publicKeyMultibase: keypairToMultibaseKey(authenticationKey),
  })

  const newAttestationKey =
    assertionMethod &&
    assertionMethod.length > 0 &&
    publicKeyToChain(assertionMethod[0])

  const newDelegationKey =
    capabilityDelegation &&
    capabilityDelegation.length > 0 &&
    publicKeyToChain(capabilityDelegation[0])

  const newKeyAgreementKeys = keyAgreement.map(publicKeyToChain)
  const newServiceDetails = service.map(serviceToChain)

  const apiInput = {
    did,
    submitter,
    newAttestationKey,
    newDelegationKey,
    newKeyAgreementKeys,
    newServiceDetails,
  }

  const encoded = api.registry
    .createType(api.tx.did.create.meta.args[0].type.toString(), apiInput)
    .toU8a()

  const { signature, verificationMethodPublicKey } = await sign({
    data: encoded,
    verificationMethodRelationship: 'authentication',
  })
  const { keyType } = multibaseKeyToDidKey(verificationMethodPublicKey)
  const encodedSignature = {
    [keyType]: signature,
  } as EncodedSignature
  return api.tx.did.create(encoded, encodedSignature)
}

/**
 * @param input
 * @param submitter
 * @param sign
 */
export async function getStoreTxFromDidDocument(
  input: DidDocumentV2.DidDocument,
  submitter: KiltAddress,
  sign: GetStoreTxSignCallback
): Promise<SubmittableExtrinsic> {
  const {
    authentication,
    assertionMethod,
    keyAgreement,
    capabilityDelegation,
    service,
    verificationMethod,
  } = input

  const authKey = (() => {
    const authVerificationMethod = verificationMethod.find(
      (vm) => vm.id === authentication[0]
    )
    if (authVerificationMethod === undefined) {
      // TODO: Better error
      throw new Error('Malformed DID document.')
    }
    const { keyType, publicKey } = multibaseKeyToDidKey(
      authVerificationMethod.publicKeyMultibase
    )
    if (verificationKeyTypesMap[keyType] === undefined) {
      // TODO: Better error
      throw new Error('Malformed DID document.')
    }
    return {
      type: keyType,
      publicKey,
    } as NewDidVerificationKey
  })()

  const keyAgreementKey = (() => {
    if (keyAgreement === undefined) {
      return undefined
    }
    const keyAgreementVerificationMethod = verificationMethod.find(
      (vm) => vm.id === keyAgreement?.[0]
    )
    if (keyAgreementVerificationMethod === undefined) {
      // TODO: Better error
      throw new Error('Malformed DID document.')
    }
    const { keyType, publicKey } = multibaseKeyToDidKey(
      keyAgreementVerificationMethod.publicKeyMultibase
    )
    if (encryptionKeyTypesMap[keyType] === undefined) {
      // TODO: Better error
      throw new Error('Malformed DID document.')
    }
    return {
      type: keyType,
      publicKey,
    } as NewDidEncryptionKey
  })()

  const assertionMethodKey = (() => {
    if (assertionMethod === undefined) {
      return undefined
    }
    const assertionMethodVerificationMethod = verificationMethod.find(
      (vm) => vm.id === assertionMethod?.[0]
    )
    if (assertionMethodVerificationMethod === undefined) {
      // TODO: Better error
      throw new Error('Malformed DID document.')
    }
    const { keyType, publicKey } = multibaseKeyToDidKey(
      assertionMethodVerificationMethod.publicKeyMultibase
    )
    if (verificationKeyTypesMap[keyType] === undefined) {
      // TODO: Better error
      throw new Error('Malformed DID document.')
    }
    return {
      type: keyType,
      publicKey,
    } as NewDidVerificationKey
  })()

  const capabilityDelegationKey = (() => {
    if (capabilityDelegation === undefined) {
      return undefined
    }
    const capabilityDelegationVerificationMethod = verificationMethod.find(
      (vm) => vm.id === capabilityDelegation?.[0]
    )
    if (capabilityDelegationVerificationMethod === undefined) {
      // TODO: Better error
      throw new Error('Malformed DID document.')
    }
    const { keyType, publicKey } = multibaseKeyToDidKey(
      capabilityDelegationVerificationMethod.publicKeyMultibase
    )
    if (verificationKeyTypesMap[keyType] === undefined) {
      // TODO: Better error
      throw new Error('Malformed DID document.')
    }
    return {
      type: keyType,
      publicKey,
    } as NewDidVerificationKey
  })()

  const storeTxInput: GetStoreTxInput = {
    authentication: [authKey],
    assertionMethod: assertionMethodKey ? [assertionMethodKey] : undefined,
    capabilityDelegation: capabilityDelegationKey
      ? [capabilityDelegationKey]
      : undefined,
    keyAgreement: keyAgreementKey ? [keyAgreementKey] : undefined,
    service,
  }

  return getStoreTxFromInput(storeTxInput, submitter, sign)
}

export interface SigningOptions {
  sign: CryptoCallbacksV2.SignExtrinsicCallback
  verificationMethodRelationship: DidDocumentV2.SignatureVerificationMethodRelationship
}

/**
 * @param root0
 * @param root0.did
 * @param root0.verificationMethodRelationship
 * @param root0.sign
 * @param root0.call
 * @param root0.txCounter
 * @param root0.submitter
 * @param root0.blockNumber
 */
export async function generateDidAuthenticatedTx({
  did,
  verificationMethodRelationship,
  sign,
  call,
  txCounter,
  submitter,
  blockNumber,
}: AuthorizeCallInput & SigningOptions): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')
  const signableCall =
    api.registry.createType<DidDidDetailsDidAuthorizedCallOperation>(
      api.tx.did.submitDidCall.meta.args[0].type.toString(),
      {
        txCounter,
        did: toChain(did),
        call,
        submitter,
        blockNumber: blockNumber ?? (await api.query.system.number()),
      }
    )
  const { signature, verificationMethodPublicKey } = await sign({
    data: signableCall.toU8a(),
    verificationMethodRelationship,
    did,
  })
  const { keyType } = multibaseKeyToDidKey(verificationMethodPublicKey)
  const encodedSignature = {
    [keyType]: signature,
  } as EncodedSignature
  return api.tx.did.submitDidCall(signableCall, encodedSignature)
}

/**
 * @param root0
 * @param root0.publicKeyMultibase
 * @param signature
 */
export function didSignatureToChain(
  { publicKeyMultibase }: DidDocumentV2.VerificationMethod,
  signature: Uint8Array
): EncodedSignature {
  const { keyType } = multibaseKeyToDidKey(publicKeyMultibase)
  if (!verificationKeyTypes.includes(keyType)) {
    throw new SDKErrors.DidError(
      `encodedDidSignature requires a verification key. A key of type "${keyType}" was used instead`
    )
  }

  return { [keyType]: signature } as EncodedSignature
}
