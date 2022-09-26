/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option } from '@polkadot/types'
import type { AccountId32, Extrinsic, Hash } from '@polkadot/types/interfaces'
import type { AnyNumber } from '@polkadot/types/types'
import type { PalletWeb3NamesWeb3NameWeb3NameOwnership } from '@polkadot/types/lookup'
import type { Bytes } from '@polkadot/types-codec'
import { BN, hexToU8a } from '@polkadot/util'

import type {
  Deposit,
  DidDocument,
  DidEncryptionKey,
  DidKey,
  DidServiceEndpoint,
  DidSignature,
  DidUri,
  DidVerificationKey,
  KiltAddress,
  NewDidEncryptionKey,
  NewDidVerificationKey,
  SignExtrinsicCallback,
  SignRequestData,
  SignResponseData,
  SubmittableExtrinsic,
  UriFragment,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { verificationKeyTypes } from '@kiltprotocol/types'
import { Crypto, SDKErrors, ss58Format } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import type {
  DidDidDetails,
  DidDidDetailsDidAuthorizedCallOperation,
  DidDidDetailsDidPublicKey,
  DidDidDetailsDidPublicKeyDetails,
  DidServiceEndpointsDidEndpoint,
  KiltSupportDeposit,
} from '@kiltprotocol/augment-api'

import {
  EncodedEncryptionKey,
  EncodedKey,
  EncodedSignature,
  EncodedVerificationKey,
  getAddressByKey,
  getFullDidUri,
  parse,
} from './Did.utils.js'

// ### Chain type definitions

export type ChainDidPublicKey = DidDidDetailsDidPublicKey
export type ChainDidPublicKeyDetails = DidDidDetailsDidPublicKeyDetails

// ### RAW QUERYING (lowest layer)

export function toChain(did: DidUri): KiltAddress {
  return parse(did).address
}

export function resourceIdToChain(id: UriFragment): string {
  return id.replace(/^#/, '')
}

export function depositFromChain(deposit: KiltSupportDeposit): Deposit {
  return {
    owner: Crypto.encodeAddress(deposit.owner, ss58Format),
    amount: deposit.amount.toBn(),
  }
}

// ### DECODED QUERYING types

type ChainDocument = Pick<
  DidDocument,
  'authentication' | 'assertionMethod' | 'capabilityDelegation' | 'keyAgreement'
> & {
  lastTxCounter: BN
  deposit: Deposit
}

// ### DECODED QUERYING (builds on top of raw querying)

function didPublicKeyDetailsFromChain(
  keyId: Hash,
  keyDetails: ChainDidPublicKeyDetails
): DidKey {
  const key = keyDetails.key.isPublicEncryptionKey
    ? keyDetails.key.asPublicEncryptionKey
    : keyDetails.key.asPublicVerificationKey
  return {
    id: `#${keyId.toHex()}`,
    type: key.type.toLowerCase() as DidKey['type'],
    publicKey: key.value.toU8a(),
  }
}

export function fromChain(encoded: AccountId32): DidUri {
  return getFullDidUri(Crypto.encodeAddress(encoded, ss58Format))
}

export function documentFromChain(
  encoded: Option<DidDidDetails>
): ChainDocument {
  const {
    publicKeys,
    authenticationKey,
    attestationKey,
    delegationKey,
    keyAgreementKeys,
    lastTxCounter,
    deposit,
  } = encoded.unwrap()

  const keys: Record<string, DidKey> = [...publicKeys.entries()]
    .map(([keyId, keyDetails]) =>
      didPublicKeyDetailsFromChain(keyId, keyDetails)
    )
    .reduce((res, key) => {
      res[resourceIdToChain(key.id)] = key
      return res
    }, {})

  const authentication = keys[authenticationKey.toHex()] as DidVerificationKey

  const didRecord: ChainDocument = {
    authentication: [authentication],
    lastTxCounter: lastTxCounter.toBn(),
    deposit: depositFromChain(deposit),
  }
  if (attestationKey.isSome) {
    const key = keys[attestationKey.unwrap().toHex()] as DidVerificationKey
    didRecord.assertionMethod = [key]
  }
  if (delegationKey.isSome) {
    const key = keys[delegationKey.unwrap().toHex()] as DidVerificationKey
    didRecord.capabilityDelegation = [key]
  }

  const keyAgreementKeyIds = [...keyAgreementKeys.values()].map((keyId) =>
    keyId.toHex()
  )
  if (keyAgreementKeyIds.length > 0) {
    didRecord.keyAgreement = keyAgreementKeyIds.map(
      (id) => keys[id] as DidEncryptionKey
    )
  }

  return didRecord
}

interface ChainEndpoint {
  id: string
  serviceTypes: DidServiceEndpoint['type']
  urls: DidServiceEndpoint['serviceEndpoint']
}

/**
 * Checks if a string is a valid URI according to RFC#3986.
 *
 * @param str String to be checked.
 * @returns Whether `str` is a valid URI.
 */
function isUri(str: string): boolean {
  try {
    const url = new URL(str) // this actually accepts any URI but throws if it can't be parsed
    return url.href === str || encodeURI(decodeURI(str)) === str // make sure our URI has not been converted implicitly by URL
  } catch {
    return false
  }
}

const UriFragmentRegex = /^[a-zA-Z0-9._~%+,;=*()'&$!@:/?-]+$/

/**
 * Checks if a string is a valid URI fragment according to RFC#3986.
 *
 * @param str String to be checked.
 * @returns Whether `str` is a valid URI fragment.
 */
function isUriFragment(str: string): boolean {
  try {
    return UriFragmentRegex.test(str) && !!decodeURIComponent(str)
  } catch {
    return false
  }
}

/**
 * Performs sanity checks on service endpoint data, making sure that the following conditions are met:
 *   - The `id` property is a string containing a valid URI fragment according to RFC#3986, not a complete DID URI.
 *   - If the `uris` property contains one or more strings, they must be valid URIs according to RFC#3986.
 *
 * @param endpoint A service endpoint object to check.
 */
export function validateService(endpoint: DidServiceEndpoint): void {
  const { id, serviceEndpoint } = endpoint
  if (id.startsWith('did:kilt')) {
    throw new SDKErrors.DidError(
      `This function requires only the URI fragment part (following '#') of the service ID, not the full DID URI, which is violated by id "${id}"`
    )
  }
  if (!isUriFragment(resourceIdToChain(id))) {
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

export function serviceToChain(endpoint: DidServiceEndpoint): ChainEndpoint {
  validateService(endpoint)
  const { id, type, serviceEndpoint } = endpoint
  return {
    id: resourceIdToChain(id),
    serviceTypes: type,
    urls: serviceEndpoint,
  }
}

export function serviceFromChain(
  encoded: Option<DidServiceEndpointsDidEndpoint>
): DidServiceEndpoint {
  const { id, serviceTypes, urls } = encoded.unwrap()
  return {
    id: `#${id.toUtf8()}`,
    type: serviceTypes.map((type) => type.toUtf8()),
    serviceEndpoint: urls.map((url) => url.toUtf8()),
  }
}

/**
 * Decode service endpoint records associated with the full DID from the KILT blockchain.
 *
 * @param encoded The data returned by `api.query.did.serviceEndpoints.entries`.
 * @returns An array of service endpoint data or an empty array if the full DID does not exist or has no service endpoints associated with it.
 */
export function servicesFromChain(
  encoded: Array<[any, Option<DidServiceEndpointsDidEndpoint>]>
): DidServiceEndpoint[] {
  return encoded.map(([, encodedValue]) => serviceFromChain(encodedValue))
}

// ### EXTRINSICS types

export type AuthorizeCallInput = {
  did: DidUri
  txCounter: AnyNumber
  call: Extrinsic
  submitter: KiltAddress
  blockNumber?: AnyNumber
}

// ### EXTRINSICS

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
): EncodedKey {
  // TypeScript can't infer type here, so we have to add a type assertion.
  return { [key.type]: key.publicKey } as EncodedKey
}

interface GetStoreTxInput {
  authentication: [NewDidVerificationKey]
  assertionMethod?: [NewDidVerificationKey]
  capabilityDelegation?: [NewDidVerificationKey]
  keyAgreement?: NewDidEncryptionKey[]

  service?: DidServiceEndpoint[]
}

export type GetStoreTxSignCallback = (
  signData: Omit<SignRequestData, 'did'>
) => Promise<Omit<SignResponseData, 'keyUri'>>

/**
 * Create a DID creation operation which includes the information provided.
 *
 * The resulting extrinsic can be submitted to create an on-chain DID that has the provided keys and service endpoints.
 *
 * A DID creation operation can contain at most 25 new service endpoints.
 * Additionally, each service endpoint must respect the following conditions:
 * - The service endpoint ID is at most 50 bytes long and is a valid URI fragment according to RFC#3986.
 * - The service endpoint has at most 1 service type, with a value that is at most 50 bytes long.
 * - The service endpoint has at most 1 URI, with a value that is at most 200 bytes long, and which is a valid URI according to RFC#3986.
 *
 * @param input The DID keys and services to store, also accepts DidDocument, so you can store a light DID for example.
 * @param submitter The KILT address authorized to submit the creation operation.
 * @param sign The sign callback. The authentication key has to be used.
 *
 * @returns The SubmittableExtrinsic for the DID creation operation.
 */
export async function getStoreTx(
  input: GetStoreTxInput | DidDocument,
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
  const did = getAddressByKey(authenticationKey)

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

  const signature = await sign({
    data: encoded,
    keyRelationship: 'authentication',
  })
  const encodedSignature = {
    [signature.keyType]: signature.data,
  } as EncodedSignature
  return api.tx.did.create(encoded, encodedSignature)
}

export interface SigningOptions {
  sign: SignExtrinsicCallback
  keyRelationship: VerificationKeyRelationship
}

/**
 * DID related operations on the KILT blockchain require authorization by a full DID. This is realized by requiring that relevant extrinsics are signed with a key featured by a full DID as a verification method.
 * Such extrinsics can be produced using this function.
 *
 * @param params Object wrapping all input to the function.
 * @param params.did Full DID.
 * @param params.keyRelationship DID key relationship to be used for authorization.
 * @param params.sign The callback to interface with the key store managing the private key to be used.
 * @param params.call The call or extrinsic to be authorized.
 * @param params.txCounter The nonce or txCounter value for this extrinsic, which must be on larger than the current txCounter value of the authorizing full DID.
 * @param params.submitter Payment account allowed to submit this extrinsic and cover its fees, which will end up owning any deposit associated with newly created records.
 * @param params.blockNumber Block number for determining the validity period of this authorization. If omitted, the current block number will be fetched from chain.
 * @returns A DID authorized extrinsic that, after signing with the payment account mentioned in the params, is ready for submission.
 */
export async function generateDidAuthenticatedTx({
  did,
  keyRelationship,
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
  const signature = await sign({
    data: signableCall.toU8a(),
    keyRelationship,
    did,
  })
  const encodedSignature = {
    [signature.keyType]: signature.data,
  } as EncodedSignature
  return api.tx.did.submitDidCall(signableCall, encodedSignature)
}

// ### Chain utils
/**
 * Compiles an enum-type key-value pair representation of a signature created with a full DID verification method. Required for creating full DID signed extrinsics.
 *
 * @param key Object describing data associated with a public key.
 * @param signature Object containing a signature generated with a full DID associated public key.
 * @returns Data restructured to allow SCALE encoding by polkadot api.
 */
export function didSignatureToChain(
  key: DidVerificationKey,
  signature: Pick<DidSignature, 'signature'>
): EncodedSignature {
  if (!verificationKeyTypes.includes(key.type)) {
    throw new SDKErrors.DidError(
      `encodedDidSignature requires a verification key. A key of type "${key.type}" was used instead`
    )
  }

  return { [key.type]: hexToU8a(signature.signature) } as EncodedSignature
}

/**
 * Web3Name is the type of nickname for a DID.
 */
export type Web3Name = string

/**
 * Decodes the web3name of a DID.
 *
 * @param encoded The value returned by `api.query.web3Names.names()`.
 * @returns The registered web3name for this DID if any.
 */
export function web3NameFromChain(encoded: Option<Bytes>): Web3Name {
  return encoded.unwrap().toUtf8()
}

/**
 * Decodes the DID of the owner of web3name.
 *
 * @param encoded The value returned by `api.query.web3Names.owner()`.
 * @returns The full DID uri, i.e. 'did:kilt:4abc...', if any.
 */
export function web3NameOwnerFromChain(
  encoded: Option<PalletWeb3NamesWeb3NameWeb3NameOwnership>
): {
  owner: DidUri
  deposit: Deposit
  claimedAt: BN
} {
  const { owner, deposit, claimedAt } = encoded.unwrap()
  return {
    owner: fromChain(owner),
    deposit: depositFromChain(deposit),
    claimedAt: claimedAt.toBn(),
  }
}
