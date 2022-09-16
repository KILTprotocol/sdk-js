/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option } from '@polkadot/types'
import type { AccountId32, Extrinsic, Hash } from '@polkadot/types/interfaces'
import type { AnyNumber } from '@polkadot/types/types'
import { BN, hexToU8a } from '@polkadot/util'
import type { ApiPromise } from '@polkadot/api'

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
  SignCallback,
  SigningOptions,
  SubmittableExtrinsic,
  UriFragment,
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
  checkServiceEndpointSizeConstraints,
  checkServiceEndpointSyntax,
  EncodedEncryptionKey,
  EncodedKey,
  EncodedSignature,
  EncodedVerificationKey,
  getAddressByKey,
  getFullDidUri,
  keyTypeForSignatureAlg,
  parseDidUri,
  signatureAlgForKeyType,
  stripFragment,
} from './Did.utils.js'

// ### Chain type definitions

export type ChainDidPublicKey = DidDidDetailsDidPublicKey
export type ChainDidPublicKeyDetails = DidDidDetailsDidPublicKeyDetails

// ### RAW QUERYING (lowest layer)

export function didToChain(did: DidUri): KiltAddress {
  return parseDidUri(did).address
}

export function resourceIdToChain(id: UriFragment): string {
  return stripFragment(id)
}

export function depositFromChain(deposit: KiltSupportDeposit): Deposit {
  return {
    owner: Crypto.encodeAddress(deposit.owner, ss58Format),
    amount: deposit.amount.toBn(),
  }
}

// Query all services for a DID given the DID.
// Interacts with the ServiceEndpoints storage double map.
async function queryAllServicesEncoded(
  did: DidUri
): Promise<DidServiceEndpointsDidEndpoint[]> {
  const api = ConfigService.get('api')
  const encodedEndpoints = await api.query.did.serviceEndpoints.entries(
    didToChain(did)
  )
  return encodedEndpoints.map(([, encodedValue]) => encodedValue.unwrap())
}

// ### DECODED QUERYING types

export type EncodedDid = Pick<
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

export function uriFromChain(encoded: AccountId32): DidUri {
  return getFullDidUri(Crypto.encodeAddress(encoded, ss58Format))
}

export function didFromChain(encoded: Option<DidDidDetails>): EncodedDid {
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

  const didRecord: EncodedDid = {
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

interface BlockchainEndpoint {
  id: string
  serviceTypes: DidServiceEndpoint['type']
  urls: DidServiceEndpoint['serviceEndpoint']
}

function endpointToBlockchainEndpoint({
  id,
  type,
  serviceEndpoint,
}: DidServiceEndpoint): BlockchainEndpoint {
  return {
    id: resourceIdToChain(id),
    serviceTypes: type,
    urls: serviceEndpoint,
  }
}

function blockchainEndpointToEndpoint({
  id,
  serviceTypes,
  urls,
}: BlockchainEndpoint): DidServiceEndpoint {
  return {
    id: `#${id}`,
    type: serviceTypes,
    serviceEndpoint: urls,
  }
}

export function serviceEndpointFromChain({
  id,
  serviceTypes,
  urls,
}: DidServiceEndpointsDidEndpoint): DidServiceEndpoint {
  return blockchainEndpointToEndpoint({
    id: id.toUtf8(),
    serviceTypes: serviceTypes.map((type) => type.toUtf8()),
    urls: urls.map((url) => url.toUtf8()),
  })
}

/**
 * Query service endpoint records associated with the full DID from the KILT blockchain.
 *
 * @param did Full DID.
 * @returns An array of service endpoint data or an empty array if the full DID does not exist or has no service endpoints associated with it.
 */
export async function queryServiceEndpoints(
  did: DidUri
): Promise<DidServiceEndpoint[]> {
  const encoded = await queryAllServicesEncoded(did)
  return encoded.map((e) => serviceEndpointFromChain(e))
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

function checkServiceEndpointInput(
  api: ApiPromise,
  endpoint: DidServiceEndpoint
): void {
  const [, syntaxErrors] = checkServiceEndpointSyntax(endpoint)
  if (syntaxErrors && syntaxErrors.length > 0) throw syntaxErrors[0]
  const [, sizeErrors] = checkServiceEndpointSizeConstraints(api, endpoint)
  if (sizeErrors && sizeErrors.length > 0) throw sizeErrors[0]
}

interface GetStoreTxInput {
  authentication: [NewDidVerificationKey]
  assertionMethod?: [NewDidVerificationKey]
  capabilityDelegation?: [NewDidVerificationKey]
  keyAgreement?: NewDidEncryptionKey[]

  service?: DidServiceEndpoint[]
}

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
 * @param sign The sign callback.
 *
 * @returns The SubmittableExtrinsic for the DID creation operation.
 */
export async function getStoreTx(
  input: GetStoreTxInput | DidDocument,
  submitter: KiltAddress,
  sign: SignCallback
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

  service.forEach((endpoint) => {
    checkServiceEndpointInput(api, endpoint)
  })

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
  const newServiceDetails = service.map(endpointToBlockchainEndpoint)

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

  const { publicKey, type } = authenticationKey
  const signature = await sign({
    data: encoded,
    meta: {},
    publicKey,
    alg: signatureAlgForKeyType[type],
  })
  const encodedSignature = { [type]: signature.data } as EncodedSignature
  return api.tx.did.create(encoded, encodedSignature)
}

/**
 * Generate an extrinsic to add the provided [[DidServiceEndpoint]] to the authorizing DID.
 *
 * @param endpoint The new service endpoint to include in the extrinsic.
 * The service endpoint must respect the following conditions:
 *     - The service endpoint ID is at most 50 ASCII characters long and is a valid URI fragment according to RFC#3986.
 *     - The service endpoint has at most 1 service type, with a value that is at most 50 ASCII characters long.
 *     - The service endpoint has at most 1 URI, with a value that is at most 200 ASCII characters long, and which is a valid URI according to RFC#3986.
 * @returns An extrinsic that must be authorized (signed) by the full DID with which the service endpoint should be associated.
 */
export async function getAddEndpointExtrinsic(
  endpoint: DidServiceEndpoint
): Promise<Extrinsic> {
  const api = ConfigService.get('api')
  checkServiceEndpointInput(api, endpoint)
  return api.tx.did.addServiceEndpoint(endpointToBlockchainEndpoint(endpoint))
}

/**
 * DID related operations on the KILT blockchain require authorization by a full DID. This is realized by requiring that relevant extrinsics are signed with a key featured by a full DID as a verification method.
 * Such extrinsics can be produced using this function.
 *
 * @param params Object wrapping all input to the function.
 * @param params.did Full DID.
 * @param params.signingPublicKey Public key of the keypair to be used for authorization as hex string or Uint8Array.
 * @param params.alg The cryptographic signing algorithm to be used.
 * @param params.sign The callback to interface with the key store managing the private key to be used.
 * @param params.call The call or extrinsic to be authorized.
 * @param params.txCounter The nonce or txCounter value for this extrinsic, which must be on larger than the current txCounter value of the authorizing full DID.
 * @param params.submitter Payment account allowed to submit this extrinsic and cover its fees, which will end up owning any deposit associated with newly created records.
 * @param params.blockNumber Block number for determining the validity period of this authorization. If omitted, the current block number will be fetched from chain.
 * @returns A DID authorized extrinsic that, after signing with the payment account mentioned in the params, is ready for submission.
 */
export async function generateDidAuthenticatedTx({
  did,
  signingPublicKey,
  alg,
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
        did: didToChain(did),
        call,
        submitter,
        blockNumber: blockNumber ?? (await api.query.system.number()),
      }
    )
  const signature = await sign({
    data: signableCall.toU8a(),
    publicKey: Crypto.coToUInt8(signingPublicKey),
    alg,
    meta: {
      method: call.method.toHex(),
      version: call.version,
      specVersion: api.runtimeVersion.specVersion.toString(),
      transactionVersion: api.runtimeVersion.transactionVersion.toString(),
      genesisHash: api.genesisHash.toHex(),
      nonce: signableCall.txCounter.toHex(),
      address: Crypto.encodeAddress(signableCall.did, ss58Format),
    },
  })
  const keyType = keyTypeForSignatureAlg[signature.alg]
  const encodedSignature = { [keyType]: signature.data } as EncodedSignature
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
