/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { GenericAccountId, Option, u128, u32 } from '@polkadot/types'
import type { Extrinsic, Hash } from '@polkadot/types/interfaces'
import type { AnyNumber } from '@polkadot/types/types'
import { BN, hexToString, hexToU8a } from '@polkadot/util'
import type { ApiPromise } from '@polkadot/api'

import type {
  Deposit,
  DidDetails,
  DidEncryptionKey,
  DidKey,
  DidServiceEndpoint,
  DidSignature,
  DidUri,
  DidVerificationKey,
  KeyRelationship,
  KiltAddress,
  NewDidEncryptionKey,
  NewDidVerificationKey,
  SignCallback,
  SigningOptions,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { encryptionKeyTypes, verificationKeyTypes } from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import type {
  DidDidDetails,
  DidDidDetailsDidAuthorizedCallOperation,
  DidDidDetailsDidPublicKey,
  DidDidDetailsDidPublicKeyDetails,
  DidServiceEndpointsDidEndpoint,
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

const log = ConfigService.LoggingFactory.getLogger('Did')

// ### Chain type definitions

export type ChainDidPublicKey = DidDidDetailsDidPublicKey
export type ChainDidPublicKeyDetails = DidDidDetailsDidPublicKeyDetails

// ### RAW QUERYING (lowest layer)

export function encodeDid(did: DidUri): KiltAddress {
  return parseDidUri(did).address
}

// Query a full DID.
// Interacts with the Did storage map.
async function queryDidEncoded(did: DidUri): Promise<Option<DidDidDetails>> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.did(encodeDid(did))
}

// Query ALL deleted DIDs, which can be very time-consuming if the number of deleted DIDs gets large.
async function queryDeletedDidsEncoded(): Promise<GenericAccountId[]> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  // Query all the storage keys, and then only take the relevant property, i.e., the encoded DID address.
  const entries = await api.query.did.didBlacklist.keys()
  return entries.map(({ args: [encodedAddresses] }) => encodedAddresses)
}

// Query a DID service given the DID and the service ID.
// Interacts with the ServiceEndpoints storage double map.
async function queryServiceEncoded(
  did: DidUri,
  serviceId: DidServiceEndpoint['id']
): Promise<Option<DidServiceEndpointsDidEndpoint>> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.serviceEndpoints(
    encodeDid(did),
    stripFragment(serviceId)
  )
}

// Query all services for a DID given the DID.
// Interacts with the ServiceEndpoints storage double map.
async function queryAllServicesEncoded(
  did: DidUri
): Promise<DidServiceEndpointsDidEndpoint[]> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const encodedEndpoints = await api.query.did.serviceEndpoints.entries(
    encodeDid(did)
  )
  return encodedEndpoints.map(([, encodedValue]) => encodedValue.unwrap())
}

// Query the # of services stored under a DID without fetching all the services.
// Interacts with the DidEndpointsCount storage map.
async function queryEndpointsCountsEncoded(did: DidUri): Promise<u32> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.didEndpointsCount(encodeDid(did))
}

async function queryDepositAmountEncoded(): Promise<u128> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return api.consts.did.deposit
}

// ### DECODED QUERYING types

export type IChainDeposit = {
  owner: KiltAddress
  amount: BN
}

export type IDidChainRecord = Pick<
  DidDetails,
  'authentication' | 'assertionMethod' | 'capabilityDelegation' | 'keyAgreement'
> & {
  lastTxCounter: BN
  deposit: IChainDeposit
}

// ### DECODED QUERYING (builds on top of raw querying)

function decodeDidDeposit(encodedDeposit: Deposit): IChainDeposit {
  return {
    amount: new BN(encodedDeposit.amount.toString()),
    owner: encodedDeposit.owner.toString() as KiltAddress,
  }
}

function decodeDidPublicKeyDetails(
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
    includedAt: keyDetails.blockNumber.toBn(),
  }
}

function decodeDidChainRecord({
  publicKeys,
  authenticationKey,
  attestationKey,
  delegationKey,
  keyAgreementKeys,
  lastTxCounter,
  deposit,
}: DidDidDetails): IDidChainRecord {
  const keys: Record<string, DidKey> = [...publicKeys.entries()]
    .map(([keyId, keyDetails]) => decodeDidPublicKeyDetails(keyId, keyDetails))
    .reduce((res, key) => {
      res[stripFragment(key.id)] = key
      return res
    }, {})

  const authentication = keys[authenticationKey.toHex()] as DidVerificationKey

  const didRecord: IDidChainRecord = {
    authentication: [authentication],
    lastTxCounter: lastTxCounter.toBn(),
    deposit: decodeDidDeposit(deposit),
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

/**
 * Query data associated with a FullDid from the KILT blockchain.
 *
 * @param did The Full DID.
 * @returns Data associated with this Did or null if the Did has not been claimed or has been deleted.
 */
export async function queryDetails(
  did: DidUri
): Promise<IDidChainRecord | null> {
  const result = await queryDidEncoded(did)
  if (result.isNone) {
    return null
  }
  return decodeDidChainRecord(result.unwrap())
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
    id: stripFragment(id),
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

function decodeServiceChainRecord({
  id,
  serviceTypes,
  urls,
}: DidServiceEndpointsDidEndpoint): DidServiceEndpoint {
  return blockchainEndpointToEndpoint({
    id: hexToString(id.toString()),
    serviceTypes: serviceTypes.map((type) => hexToString(type.toString())),
    urls: urls.map((url) => hexToString(url.toString())),
  })
}

/**
 * Query service endpoint records associated with a FullDid from the KILT blockchain.
 *
 * @param did Full DID.
 * @returns An array of service endpoint data or an empty array if the FullDid does not exist or has no service endpoints associated with it.
 */
export async function queryServiceEndpoints(
  did: DidUri
): Promise<DidServiceEndpoint[]> {
  const encoded = await queryAllServicesEncoded(did)
  return encoded.map((e) => decodeServiceChainRecord(e))
}

/**
 * Query a service endpoint record associated with a FullDid from the KILT blockchain.
 *
 * @param did Full DID.
 * @param serviceId ID of the requested service endpoint (not the full endpoint uri).
 * @returns Service endpoint data or null if the requested endpoint is not found on this FullDid, or if the FullDid does not exist.
 */
export async function queryServiceEndpoint(
  did: DidUri,
  serviceId: DidServiceEndpoint['id']
): Promise<DidServiceEndpoint | null> {
  const serviceEncoded = await queryServiceEncoded(did, serviceId)
  if (serviceEncoded.isNone) return null

  return decodeServiceChainRecord(serviceEncoded.unwrap())
}

/**
 * Gets the total number of service endpoints associated with a given FullDid.
 *
 * @param did Full DID.
 * @returns Number of endpoints.
 */
export async function queryEndpointsCounts(did: DidUri): Promise<BN> {
  const endpointsCountEncoded = await queryEndpointsCountsEncoded(did)
  return endpointsCountEncoded.toBn()
}

/**
 * Gets the state of a FullDid's transaction counter which is bumped with each transaction authorized by that DID for replay protection purposes.
 *
 * @param did Full DID.
 * @returns Current state of the transaction counter which must be increased by one to yield the next transaction's nonce.
 */
export async function queryNonce(did: DidUri): Promise<BN> {
  const encoded = await queryDidEncoded(did)
  return encoded.isSome ? encoded.unwrap().lastTxCounter.toBn() : new BN(0)
}

/**
 * Checks whether this full DID had previously been deleted, resulting in it being blocked from (re)creation.
 *
 * @param did Full DID.
 * @returns Whether or not the DID is listed in the block list.
 */
export async function queryDidDeletionStatus(did: DidUri): Promise<boolean> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  // The following function returns something different from 0x00 if there is an entry for the provided key, 0x00 otherwise.
  const encodedStorageHash = await api.query.did.didBlacklist.hash(
    encodeDid(did)
  )
  // isEmpty returns true if there is no entry for the given key -> the function should return false.
  return !encodedStorageHash.isEmpty
}

/**
 * Gets the current deposit amount due for the creation of new FullDids.
 *
 * @returns Deposit amount in Femto Kilt as a BigNumber.
 */
export async function queryDepositAmount(): Promise<BN> {
  const encodedDeposit = await queryDepositAmountEncoded()
  return encodedDeposit.toBn()
}

/**
 * Queries the full list of FullDids that have previously been deleted, resulting in them being blocked from (re)creation.
 *
 * @returns An array of DID addresses that have been deleted.
 */
export async function queryDeletedDids(): Promise<DidUri[]> {
  const encodedAddresses = await queryDeletedDidsEncoded()
  return encodedAddresses.map((id) =>
    getFullDidUri(id.toHuman() as KiltAddress)
  )
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

export function encodePublicKey(
  key: NewDidVerificationKey
): EncodedVerificationKey
export function encodePublicKey(key: NewDidEncryptionKey): EncodedEncryptionKey

/**
 * Transforms a DID public key record to an enum-type key-value pair required in many key-related extrinsics.
 *
 * @param key Object describing data associated with a public key.
 * @returns Data restructured to allow SCALE encoding by polkadot api.
 */
export function encodePublicKey(
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
 * Create a DID creation operation which includes the information present in the provided DID details.
 *
 * The resulting extrinsic can be submitted to create an on-chain DID that has the same keys and service endpoints of the provided DID details.
 *
 * A DID creation operation can contain at most 25 new service endpoints.
 * Additionally, each service endpoint must respect the following conditions:
 * - The service endpoint ID is at most 50 bytes long and is a valid URI fragment according to RFC#3986.
 * - The service endpoint has at most 1 service type, with a value that is at most 50 bytes long.
 * - The service endpoint has at most 1 URI, with a value that is at most 200 bytes long, and which is a valid URI according to RFC#3986.
 *
 * @param input The DID keys and services to store, also accepts DidDetails, so you can store a light DID for example.
 * @param submitter The KILT address authorized to submit the creation operation.
 * @param sign The sign callback.
 *
 * @returns The SubmittableExtrinsic for the DID creation operation.
 */
export async function getStoreTx(
  input: GetStoreTxInput | DidDetails,
  submitter: KiltAddress,
  sign: SignCallback
): Promise<SubmittableExtrinsic> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()

  const {
    authentication,
    assertionMethod,
    capabilityDelegation,
    keyAgreement = [],
    service = [],
  } = input

  if (!authentication?.[0]) {
    throw new SDKErrors.DidError(
      `The provided DID does not have an authentication key to sign the creation operation`
    )
  }

  // For now, it only takes the first attestation key, if present.
  if (assertionMethod && assertionMethod.length > 1) {
    log.warn(
      `More than one attestation key (${assertionMethod.length}) specified. Only the first will be stored on the chain.`
    )
  }

  // For now, it only takes the first delegation key, if present.
  if (capabilityDelegation && capabilityDelegation.length > 1) {
    log.warn(
      `More than one delegation key (${capabilityDelegation.length}) specified. Only the first will be stored on the chain.`
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
    assertionMethod?.[0] && encodePublicKey(assertionMethod[0])
  const newDelegationKey =
    capabilityDelegation?.[0] && encodePublicKey(capabilityDelegation[0])
  const newKeyAgreementKeys = keyAgreement.map(encodePublicKey)
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

  const signature = await sign({
    data: encoded,
    meta: {},
    publicKey: Crypto.coToUInt8(authenticationKey.publicKey),
    alg: signatureAlgForKeyType[authenticationKey.type],
  })
  const keyType = keyTypeForSignatureAlg[signature.alg]
  const encodedSignature = { [keyType]: signature.data } as EncodedSignature
  return api.tx.did.create(encoded, encodedSignature)
}

/**
 * Builds an extrinsic to set a new public key for a given verification relationship, replacing any keys that occupied this role previously.
 *
 * @param keyRelationship The role or relationship which the new key should have according to the DID specifications (e.g. Authentication, assertionMethod, capabilityDelegation...).
 * @param key Data describing the public key.
 * @returns An extrinsic that must be authorized (signed) by the FullDid whose keys should be changed.
 */
export async function getSetKeyExtrinsic(
  keyRelationship: KeyRelationship,
  key: NewDidVerificationKey
): Promise<Extrinsic> {
  if (!verificationKeyTypes.includes(key.type)) {
    throw new SDKErrors.DidError(
      `Unacceptable key type for key with role ${keyRelationship}: ${
        (key as any).type
      }`
    )
  }
  const typedKey = encodePublicKey(key)
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  switch (keyRelationship) {
    case 'authentication':
      return api.tx.did.setAuthenticationKey(typedKey)
    case 'capabilityDelegation':
      return api.tx.did.setDelegationKey(typedKey)
    case 'assertionMethod':
      return api.tx.did.setAttestationKey(typedKey)
    default:
      throw new SDKErrors.DidError(
        `Setting a key is only allowed for the following key types: ${[
          'authentication',
          'capabilityDelegation',
          'assertionMethod',
        ]}`
      )
  }
}

/**
 * Builds an extrinsic to remove a public key for a given verification relationship.
 *
 * @param keyRelationship The key's role or relationship according to the DID specifications (e.g. Authentication, assertionMethod, capabilityDelegation, keyAgreement...).
 * @param keyId Where a verification relationship allows multiple keys in the same role, you will need to identify the key to be removed with its id (not the full key uri).
 * @returns An extrinsic that must be authorized (signed) by the FullDid whose keys should be changed.
 */
export async function getRemoveKeyExtrinsic(
  keyRelationship: KeyRelationship,
  keyId?: DidKey['id']
): Promise<Extrinsic> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  switch (keyRelationship) {
    case 'capabilityDelegation':
      return api.tx.did.removeDelegationKey()
    case 'assertionMethod':
      return api.tx.did.removeAttestationKey()
    case 'keyAgreement':
      if (!keyId) {
        throw new SDKErrors.DidError(
          'When removing a keyAgreement key it is required to specify the id of the key to be removed'
        )
      }
      return api.tx.did.removeKeyAgreementKey(keyId)
    default:
      throw new SDKErrors.DidError(
        `Key removal is only allowed for the following key types: ${[
          'keyAgreement',
          'capabilityDelegation',
          'assertionMethod',
        ]}`
      )
  }
}

/**
 * Builds an extrinsic to add another public key for a given verification relationship if this allows multiple keys in the same role.
 *
 * @param keyRelationship The role or relationship which the new key should have according to the DID specifications (currently only keyAgreement allows multiple keys).
 * @param key Data describing the public key.
 * @returns An extrinsic that must be authorized (signed) by the FullDid whose keys should be changed.
 */
export async function getAddKeyExtrinsic(
  keyRelationship: KeyRelationship,
  key: NewDidEncryptionKey
): Promise<Extrinsic> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  if (keyRelationship === 'keyAgreement') {
    if (!encryptionKeyTypes.includes(key.type))
      throw new SDKErrors.DidError(
        `Unacceptable key type for key with role ${keyRelationship}: ${key.type}`
      )
    const keyAsEnum = encodePublicKey(key)
    return api.tx.did.addKeyAgreementKey(keyAsEnum)
  }
  throw new SDKErrors.DidError(
    `Adding to the key set is only allowed for the following key types: ${[
      'keyAgreement',
    ]}`
  )
}

/**
 * Generate an extrinsic to add the provided [[DidServiceEndpoint]] to the authorizing DID.
 *
 * @param endpoint The new service endpoint to include in the extrinsic.
 * The service endpoint must respect the following conditions:
 *     - The service endpoint ID is at most 50 ASCII characters long and is a valid URI fragment according to RFC#3986.
 *     - The service endpoint has at most 1 service type, with a value that is at most 50 ASCII characters long.
 *     - The service endpoint has at most 1 URI, with a value that is at most 200 ASCII characters long, and which is a valid URI according to RFC#3986.
 * @returns An extrinsic that must be authorized (signed) by the FullDid with which the service endpoint should be associated.
 */
export async function getAddEndpointExtrinsic(
  endpoint: DidServiceEndpoint
): Promise<Extrinsic> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  checkServiceEndpointInput(api, endpoint)
  return api.tx.did.addServiceEndpoint(endpointToBlockchainEndpoint(endpoint))
}

/**
 * Generate an extrinsic to remove the service endpoint with the provided ID from to the state of the authorizing DID.
 *
 * @param endpointId The ID of the service endpoint to include in the extrinsic.
 * The ID must be at most 50 ASCII characters long.
 * @returns An extrinsic that must be authorized (signed) by the FullDid associated with the service endpoint to be removed.
 */
export async function getRemoveEndpointExtrinsic(
  endpointId: DidServiceEndpoint['id']
): Promise<Extrinsic> {
  const strippedId = stripFragment(endpointId)
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const maxServiceIdLength = api.consts.did.maxServiceIdLength.toNumber()
  if (strippedId.length > maxServiceIdLength) {
    throw new SDKErrors.DidError(
      `The service ID "${endpointId}" has is too long. Max number of characters allowed for a service ID is ${maxServiceIdLength}.`
    )
  }

  return api.tx.did.removeServiceEndpoint(strippedId)
}

/**
 * Produces an extrinsic to remove the signing FullDid from the KILT blockchain.
 *
 * @param endpointsCount The current number of service endpoints associated with the FullDid to be deleted, which is important for the precalculation of the deletion fee.
 * @returns An extrinsic that must be authorized (signed) by the FullDid to be deleted.
 */
export async function getDeleteDidExtrinsic(
  endpointsCount: BN
): Promise<Extrinsic> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.delete(endpointsCount)
}

/**
 * Produces an extrinsic to reclaim a deposit paid for storing a FullDid record on the KILT blockchain, resulting in the deletion of that Did.
 *
 * @param did Full DID.
 * @param endpointsCount The current number of service endpoints associated with the FullDid to be deleted, which is important for the precalculation of the deletion fee.
 * @returns An extrinsic that is to be signed by the payment account owning the deposit, without prior DID authorization.
 */
export async function getReclaimDepositExtrinsic(
  did: DidUri,
  endpointsCount: BN
): Promise<SubmittableExtrinsic> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.reclaimDeposit(encodeDid(did), endpointsCount)
}

/**
 * DID related operations on the KILT blockchain require authorization by a FullDid. This is realized by requiring that relevant extrinsics are signed with a key featured by a FullDid as a verification method.
 * Such extrinsics can be produced using this function.
 *
 * @param params Object wrapping all input to the function.
 * @param params.did Full DID.
 * @param params.signingPublicKey Public key of the keypair to be used for authorization as hex string or Uint8Array.
 * @param params.alg The cryptographic signing algorithm to be used.
 * @param params.sign The callback to interface with the key store managing the private key to be used.
 * @param params.call The call or extrinsic to be authorized.
 * @param params.txCounter The nonce or txCounter value for this extrinsic, which must be on larger than the current txCounter value of the authorizing FullDid.
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
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const signableCall =
    api.registry.createType<DidDidDetailsDidAuthorizedCallOperation>(
      api.tx.did.submitDidCall.meta.args[0].type.toString(),
      {
        txCounter,
        did: encodeDid(did),
        call,
        submitter,
        blockNumber: blockNumber || (await api.query.system.number()),
      }
    )
  const signature = await sign({
    data: signableCall.toU8a(),
    meta: {
      method: call.method.toHex(),
      version: call.version,
      specVersion: api.runtimeVersion.specVersion.toString(),
      transactionVersion: api.runtimeVersion.transactionVersion.toString(),
      genesisHash: api.genesisHash.toHex(),
      nonce: signableCall.txCounter.toHex(),
      address: Crypto.encodeAddress(signableCall.did),
    },
    publicKey: Crypto.coToUInt8(signingPublicKey),
    alg,
  })
  const keyType = keyTypeForSignatureAlg[signature.alg]
  const encodedSignature = { [keyType]: signature.data } as EncodedSignature
  return api.tx.did.submitDidCall(signableCall, encodedSignature)
}

// ### Chain utils
/**
 * Compiles an enum-type key-value pair representation of a signature created with a FullDid verification method. Required for creating FullDid signed extrinsics.
 *
 * @param key Object describing data associated with a public key.
 * @param signature Object containing a signature generated with a FullDid associated public key.
 * @returns Data restructured to allow SCALE encoding by polkadot api.
 */
export function encodeDidSignature(
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
