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
  DidDidDetailsDidPublicKey,
  DidDidDetailsDidPublicKeyDetails,
  DidServiceEndpointsDidEndpoint,
  KiltSupportDeposit,
} from '@kiltprotocol/augment-api'

import type {
  BN,
  Deposit,
  DidDocumentV2,
  KiltAddress,
  SignExtrinsicCallback,
  SignRequestData,
  SignResponseData,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import { ConfigService } from '@kiltprotocol/config'
import { Crypto, SDKErrors, ss58Format } from '@kiltprotocol/utils'

import {
  DidKeyType,
  EncryptionKeyType,
  NewServiceEndpoint,
  NewVerificationMethod,
  VerificationKeyType,
  verificationKeyTypes,
  VerificationMethodRelationship,
} from './DidDetailsv2/DidDetailsV2.js'

import { decodeMulticodecVerificationMethod, getAddressByKey, getAddressByVerificationMethod, getFullDidUri, parse } from './Did2.utils.js'
import { ChainDidPublicKeyDetails, EncodedSignature } from './Did2.chain.js'

export type ChainDidIdentifier = KiltAddress

export type EncodedVerificationKey =
  | { sr25519: Uint8Array }
  | { ed25519: Uint8Array }
  | { ecdsa: Uint8Array }

export type EncodedEncryptionKey = { x25519: Uint8Array }
export type EncodedKey = EncodedVerificationKey | EncodedEncryptionKey

export function toChain(did: DidDocumentV2.DidUri): ChainDidIdentifier {
  return parse(did).address
}

export function fragmentIdToChain(id: DidDocumentV2.UriFragment): string {
  return id.replace(/^#/, '')
}

export function fromChain(encoded: AccountId32): DidDocumentV2.DidUri {
  return getFullDidUri(Crypto.encodeAddress(encoded, ss58Format))
}

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
  type: VerificationKeyType
}
export type ChainDidEncryptionKey = ChainDidBaseKey & {
  type: EncryptionKeyType
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

function didPublicKeyDetailsFromChain(
  keyId: Hash,
  keyDetails: ChainDidPublicKeyDetails
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
    .map(([keyId, keyDetails]) =>
      didPublicKeyDetailsFromChain(keyId, keyDetails)
    )
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

export function verificationMethodToChain(
  verificationMethod: Pick<
    DidDocumentV2.VerificationMethod,
    'publicKeyMultibase'
  >
): EncodedKey {
  const { keyType, publicKey } =
    decodeMulticodecVerificationMethod(verificationMethod)
  return {
    [keyType]: publicKey,
  } as EncodedKey
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

export function validateNewService(endpoint: NewServiceEndpoint): void {
  const { id, serviceEndpoint } = endpoint
  if (id.startsWith('did:kilt')) {
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

export function serviceToChain(service: NewServiceEndpoint): ChainDidService {
  validateNewService(service)
  const { id, type, serviceEndpoint } = service
  return {
    id: fragmentIdToChain(id),
    serviceTypes: type,
    urls: serviceEndpoint,
  }
}

export function serviceFromChain(
  encoded: Option<DidServiceEndpointsDidEndpoint>
): NewServiceEndpoint {
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
  authentication: [NewVerificationMethod]
  assertionMethod?: [NewVerificationMethod]
  capabilityDelegation?: [NewVerificationMethod]
  keyAgreement?: NewVerificationMethod[]

  service?: NewServiceEndpoint[]
}

export type GetStoreTxSignCallback = (
  signData: Omit<SignRequestData, 'did'>
) => Promise<SignResponseData>

export async function getStoreTx(
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
  if (assertionMethod && assertionMethod.length > 1) {
    throw new SDKErrors.DidError(
      `More than one attestation key (${assertionMethod.length}) specified. The chain can only store one.`
    )
  }

  // For now, it only takes the first delegation key, if present.
  if (capabilityDelegation && capabilityDelegation.length > 1) {
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
  const did = getAddressByVerificationMethod(authenticationKey)

  const newAttestationKey =
    assertionMethod &&
    assertionMethod.length > 0 &&
    getAddressByVerificationMethod(assertionMethod[0])

  const newDelegationKey =
    capabilityDelegation &&
    capabilityDelegation.length > 0 &&
    getAddressByVerificationMethod(capabilityDelegation[0])

  const newKeyAgreementKeys = keyAgreement.map(getAddressByVerificationMethod)
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

  const { verificationMethod, signature } = await sign({
    data: encoded,
    verificationMethodRelationship: 'authentication',
  })
  const { keyType } = decodeMulticodecVerificationMethod(verificationMethod)
  const encodedSignature = {
    [keyType]: signature,
  } as EncodedSignature
  return api.tx.did.create(encoded, encodedSignature)
}
