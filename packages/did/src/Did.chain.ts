/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  BTreeMap,
  BTreeSet,
  Enum,
  Option,
  Struct,
  Vec,
  u8,
  u64,
  GenericAccountId,
  Text,
  u128,
  u32,
} from '@polkadot/types'
import type {
  BlockNumber,
  Call,
  Extrinsic,
  Hash,
} from '@polkadot/types/interfaces'
import type { AnyNumber } from '@polkadot/types/types'
import { BN, hexToString, hexToU8a } from '@polkadot/util'
import type { ApiPromise } from '@polkadot/api'

import {
  Deposit,
  DidEncryptionKey,
  DidKey,
  DidServiceEndpoint,
  DidSignature,
  DidVerificationKey,
  EncryptionKeyType,
  DidIdentifier,
  IIdentity,
  KeyRelationship,
  KeystoreSigner,
  KeystoreSigningOptions,
  NewDidKey,
  SubmittableExtrinsic,
  VerificationKeyType,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import type { DidDetails } from './DidDetails/index.js'
import type { FullDidCreationDetails } from './types.js'
import {
  checkServiceEndpointSizeConstraints,
  checkServiceEndpointSyntax,
  getSigningAlgorithmForVerificationKeyType,
  getVerificationKeyTypeForSigningAlgorithm,
} from './Did.utils.js'

const log = ConfigService.LoggingFactory.getLogger('Did')

// ### Chain type definitions

type KeyId = Hash
type ChainDidKeyAgreementKeys = BTreeSet<KeyId>

export interface ChainDidKey extends Enum {
  type: string
  value: Vec<u8>
}

export interface ChainDidPublicKey extends Enum {
  isPublicVerificationKey: boolean
  asPublicVerificationKey: ChainDidKey
  isPublicEncryptionKey: boolean
  asPublicEncryptionKey: ChainDidKey
  type: 'PublicVerificationKey' | 'PublicEncryptionKey'
  value: ChainDidKey
}

interface ChainDidPublicKeyDetails extends Struct {
  key: ChainDidPublicKey
  blockNumber: BlockNumber
}

type ChainDidPublicKeyMap = BTreeMap<KeyId, ChainDidPublicKeyDetails>

interface IDidChainRecordCodec extends Struct {
  authenticationKey: KeyId
  keyAgreementKeys: ChainDidKeyAgreementKeys
  delegationKey: Option<KeyId>
  attestationKey: Option<KeyId>
  publicKeys: ChainDidPublicKeyMap
  lastTxCounter: u64
  deposit: Deposit
}

interface IServiceEndpointChainRecordCodec extends Struct {
  id: Text
  serviceTypes: Vec<Text>
  urls: Vec<Text>
}

// ### RAW QUERYING (lowest layer)

// Query a full DID given the identifier (a KILT address for v1).
// Interacts with the Did storage map.
async function queryDidEncoded(
  didIdentifier: DidIdentifier
): Promise<Option<IDidChainRecordCodec>> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.did<Option<IDidChainRecordCodec>>(didIdentifier)
}

// Query ALL deleted DIDs, which can be very time consuming if the number of deleted DIDs gets large.
async function queryDeletedDidsEncoded(): Promise<GenericAccountId[]> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  // Query all the storage keys, and then only take the relevant property, i.e., the encoded DID identifier.
  return api.query.did.didBlacklist
    .keys<GenericAccountId[]>()
    .then((entries) =>
      entries.map(({ args: [encodedDidIdentifier] }) => encodedDidIdentifier)
    )
}

// Query a DID service given the DID identifier and the service ID.
// Interacts with the ServiceEndpoints storage double map.
async function queryServiceEncoded(
  didIdentifier: DidIdentifier,
  serviceId: string
): Promise<Option<IServiceEndpointChainRecordCodec>> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.serviceEndpoints<
    Option<IServiceEndpointChainRecordCodec>
  >(didIdentifier, serviceId)
}

// Query all services for a DID given the DID identifier.
// Interacts with the ServiceEndpoints storage double map.
async function queryAllServicesEncoded(
  didIdentifier: DidIdentifier
): Promise<IServiceEndpointChainRecordCodec[]> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const encodedEndpoints = await api.query.did.serviceEndpoints.entries<
    Option<IServiceEndpointChainRecordCodec>
  >(didIdentifier)
  return encodedEndpoints.map(([, encodedValue]) => encodedValue.unwrap())
}

// Query the # of services stored under a DID without fetching all the services.
// Interacts with the DidEndpointsCount storage map.
async function queryEndpointsCountsEncoded(
  didIdentifier: DidIdentifier
): Promise<u32> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.didEndpointsCount<u32>(didIdentifier)
}

async function queryDepositAmountEncoded(): Promise<u128> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.consts.did.deposit as u128
}

// ### DECODED QUERYING types

export type IChainDeposit = {
  owner: IIdentity['address']
  amount: BN
}

export type IDidChainRecordJSON = {
  authenticationKey: DidVerificationKey['id']
  keyAgreementKeys: Array<DidEncryptionKey['id']>
  capabilityDelegationKey?: DidVerificationKey['id']
  assertionMethodKey?: DidVerificationKey['id']
  publicKeys: DidKey[]
  lastTxCounter: BN
  deposit: IChainDeposit
}

// ### DECODED QUERYING (builds on top of raw querying)

function decodeDidDeposit(encodedDeposit: Deposit): IChainDeposit {
  return {
    amount: new BN(encodedDeposit.amount.toString()),
    owner: encodedDeposit.owner.toString(),
  }
}

const chainTypeToDidKeyType: Record<string, DidKey['type']> = {
  Sr25519: VerificationKeyType.Sr25519,
  Ed25519: VerificationKeyType.Ed25519,
  Ecdsa: VerificationKeyType.Ecdsa,
  X25519: EncryptionKeyType.X25519,
}
function decodeDidPublicKeyDetails(
  keyId: Hash,
  keyDetails: ChainDidPublicKeyDetails
): DidKey {
  const key = keyDetails.key.value
  const keyType = chainTypeToDidKeyType[key.type]
  if (!keyType) {
    throw new SDKErrors.ERROR_DID_ERROR(
      `Unsupported key type "${key.type}" found on chain.`
    )
  }
  return {
    id: keyId.toHex(),
    type: keyType,
    publicKey: key.value.toU8a(),
    includedAt: keyDetails.blockNumber.toBn(),
  }
}

function decodeDidChainRecord(
  didDetail: IDidChainRecordCodec
): IDidChainRecordJSON {
  const publicKeys: DidKey[] = [...didDetail.publicKeys.entries()].map(
    ([keyId, keyDetails]) => {
      return decodeDidPublicKeyDetails(keyId, keyDetails)
    }
  )
  const authenticationKeyId = didDetail.authenticationKey.toHex()
  const keyAgreementKeyIds = [...didDetail.keyAgreementKeys.values()].map(
    (keyId) => {
      return keyId.toHex()
    }
  )

  const didRecord: IDidChainRecordJSON = {
    publicKeys,
    authenticationKey: authenticationKeyId,
    keyAgreementKeys: keyAgreementKeyIds,
    lastTxCounter: didDetail.lastTxCounter.toBn(),
    deposit: decodeDidDeposit(didDetail.deposit),
  }
  if (didDetail.delegationKey.isSome) {
    didRecord.capabilityDelegationKey = didDetail.delegationKey.unwrap().toHex()
  }
  if (didDetail.attestationKey.isSome) {
    didRecord.assertionMethodKey = didDetail.attestationKey.unwrap().toHex()
  }
  return didRecord
}

/**
 * Query data associated with a FullDid from the KILT blockchain.
 *
 * @param didIdentifier Unique identifier of the FullDid (i.e. Minus the prefix kilt:did:).
 * @returns Data associated with this Did or null if the Did has not been claimed or has been deleted.
 */
export async function queryDetails(
  didIdentifier: DidIdentifier
): Promise<IDidChainRecordJSON | null> {
  const result = await queryDidEncoded(didIdentifier)
  if (result.isNone) {
    return null
  }
  return decodeDidChainRecord(result.unwrap())
}

/**
 * Query a key record associated with a FullDid from the KILT blockchain.
 *
 * @param didIdentifier Unique identifier of the FullDid (i.e. Minus the prefix kilt:did:).
 * @param keyId Identifier of the requested public key (not the full key uri).
 * @returns Public key data or null if the requested key is not found on this FullDid, or if the FullDid does not exist.
 */
export async function queryKey(
  didIdentifier: DidIdentifier,
  keyId: DidKey['id']
): Promise<DidKey | null> {
  const didDetails = await queryDetails(didIdentifier)
  if (!didDetails) {
    return null
  }
  return didDetails.publicKeys.find((key) => key.id === keyId) || null
}

function decodeServiceChainRecord(
  serviceDetails: IServiceEndpointChainRecordCodec
): DidServiceEndpoint {
  const id = hexToString(serviceDetails.id.toString())
  return {
    id,
    types: serviceDetails.serviceTypes.map((type) =>
      hexToString(type.toString())
    ),
    urls: serviceDetails.urls.map((url) => hexToString(url.toString())),
  }
}

/**
 * Query service endpoint records associated with a FullDid from the KILT blockchain.
 *
 * @param didIdentifier Unique identifier of the FullDid (i.e. Minus the prefix kilt:did:).
 * @returns An array of service endpoint data or an empty array if the FullDid does not exist or has no service endpoints associated with it.
 */
export async function queryServiceEndpoints(
  didIdentifier: DidIdentifier
): Promise<DidServiceEndpoint[]> {
  const encoded = await queryAllServicesEncoded(didIdentifier)
  return encoded.map((e) => decodeServiceChainRecord(e))
}

/**
 * Query a service endpoint record associated with a FullDid from the KILT blockchain.
 *
 * @param didIdentifier Unique identifier of the FullDid (i.e. Minus the prefix kilt:did:).
 * @param serviceId Identifier of the requested service endpoint (not the full endpoint uri).
 * @returns Service endpoint data or null if the requested endpoint is not found on this FullDid, or if the FullDid does not exist.
 */
export async function queryServiceEndpoint(
  didIdentifier: DidIdentifier,
  serviceId: DidServiceEndpoint['id']
): Promise<DidServiceEndpoint | null> {
  const serviceEncoded = await queryServiceEncoded(didIdentifier, serviceId)
  if (serviceEncoded.isNone) return null

  return decodeServiceChainRecord(serviceEncoded.unwrap())
}

/**
 * Gets the total number of service endpoints associated with a given FullDid.
 *
 * @param didIdentifier Unique identifier of the FullDid (i.e. Minus the prefix kilt:did:).
 * @returns Number of endpoints.
 */
export async function queryEndpointsCounts(
  didIdentifier: DidIdentifier
): Promise<BN> {
  const endpointsCountEncoded = await queryEndpointsCountsEncoded(didIdentifier)
  return endpointsCountEncoded.toBn()
}

/**
 * Gets the state of a FullDid's transaction counter which is bumped with each transaction authorized by that DID for replay protection purposes.
 *
 * @param didIdentifier Unique identifier of the FullDid (i.e. Minus the prefix kilt:did:).
 * @returns Current state of the transaction counter which must be increased by one to yield the next transaction's nonce.
 */
export async function queryNonce(didIdentifier: DidIdentifier): Promise<BN> {
  const encoded = await queryDidEncoded(didIdentifier)
  return encoded.isSome ? encoded.unwrap().lastTxCounter.toBn() : new BN(0)
}

/**
 * Checks whether a FullDid with a given identifier had previously been deleted, resulting in it being blocked from (re)creation.
 *
 * @param didIdentifier Unique identifier of the FullDid (i.e. Minus the prefix kilt:did:).
 * @returns Whether or not the didIdentifier is listed in the block list.
 */
export async function queryDidDeletionStatus(
  didIdentifier: DidIdentifier
): Promise<boolean> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  // The following function returns something different than 0x00 if there is an entry for the provided key, 0x00 otherwise.
  const encodedStorageHash = await api.query.did.didBlacklist.hash(
    didIdentifier
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
 * @returns An array of DID identifiers that have been deleted.
 */
export async function queryDeletedDidIdentifiers(): Promise<DidIdentifier[]> {
  const encodedIdentifiers = await queryDeletedDidsEncoded()
  return encodedIdentifiers.map((id) => id.toHuman())
}

// ### EXTRINSICS types

export type PublicKeyEnum = Record<string, Uint8Array>
export type SignatureEnum = Record<string, Uint8Array>

export type AuthorizeCallInput = {
  didIdentifier: DidIdentifier
  txCounter: AnyNumber
  call: Extrinsic
  submitter: IIdentity['address']
  blockNumber?: AnyNumber
}

interface IDidAuthorizedCallOperation extends Struct {
  did: DidIdentifier
  txCounter: u64
  call: Call
  submitter: GenericAccountId
  blockNumber: AnyNumber
}

// ### EXTRINSICS

/**
 * Transforms a DID public key record to an enum-type key-value pair required in many key-related extrinsics.
 *
 * @param key Object describing data associated with a public key.
 * @returns Data restructured to allow SCALE encoding by polkadot api.
 */
export function formatPublicKey(key: NewDidKey): PublicKeyEnum {
  const { type, publicKey } = key
  return { [type]: publicKey }
}

function checkServiceEndpointInput(
  api: ApiPromise,
  endpoint: DidServiceEndpoint
): void {
  const [, syntaxErrors] = checkServiceEndpointSyntax(endpoint)
  if (syntaxErrors && syntaxErrors.length) throw syntaxErrors[0]
  const [, sizeErrors] = checkServiceEndpointSizeConstraints(api, endpoint)
  if (sizeErrors && sizeErrors.length) throw sizeErrors[0]
}

/**
 * Create a DID creation operation which includes the provided [[FullDidCreationDetails]].
 *
 * The resulting extrinsic can be submitted to create an on-chain DID that contains the information provided.
 *
 * @param details The creation details.
 * @param details.identifier The identifier of the new DID.
 * @param details.authenticationKey The authentication key of the new DID.
 * @param details.keyAgreementKeys The optional key agreement keys of the new DID.
 * A DID creation operation can contain at most 10 new key agreement keys.
 * @param details.assertionKey The optional attestation key of the new DID.
 * @param details.delegationKey The optional delegation key of the new DID.
 * @param details.serviceEndpoints The optional service endpoints of the new DID.
 * A DID creation operation can contain at most 25 new service endpoints.
 * Additionally, each service endpoint must respect the following conditions:
 *     - The service endpoint ID is at most 50 ASCII characters long and is a valid URI fragment according to RFC#3986.
 *     - The service endpoint has at most 1 service type, with a value that is at most 50 ASCII characters long.
 *     - The service endpoint has at most 1 URL, with a value that is at most 200 ASCII characters long, and which is a valid URI according to RFC#3986.
 * @param submitterAddress The KILT address authorised to submit the creation operation.
 * @param signer The keystore signer.
 *
 * @returns The SubmittableExtrinsic for the DID creation operation.
 */
export async function generateCreateTxFromCreationDetails(
  details: FullDidCreationDetails,
  submitterAddress: IIdentity['address'],
  signer: KeystoreSigner
): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()

  const {
    authenticationKey,
    keyAgreementKeys = [],
    assertionKey,
    delegationKey,
    serviceEndpoints = [],
  } = details

  const maxKeyAgreementKeys = (
    api.consts.did.maxNewKeyAgreementKeys as u32
  ).toNumber()

  if (keyAgreementKeys.length > maxKeyAgreementKeys) {
    throw new SDKErrors.ERROR_DID_ERROR(
      `The number of key agreement keys in the creation operation is greater than the maximum allowed, which is ${maxKeyAgreementKeys}.`
    )
  }

  const newKeyAgreementKeys: PublicKeyEnum[] = keyAgreementKeys.map(
    ({ publicKey }) =>
      formatPublicKey({ type: EncryptionKeyType.X25519, publicKey })
  )

  const newAssertionKey = assertionKey
    ? formatPublicKey(assertionKey)
    : undefined
  const newDelegationKey = delegationKey
    ? formatPublicKey(delegationKey)
    : undefined

  const maxNumberOfServicesPerDid = (
    api.consts.did.maxNumberOfServicesPerDid as u32
  ).toNumber()

  if (serviceEndpoints.length > maxNumberOfServicesPerDid) {
    throw new SDKErrors.ERROR_DID_ERROR(
      `Cannot store more than ${maxNumberOfServicesPerDid} service endpoints per DID.`
    )
  }

  serviceEndpoints.forEach((service) => {
    checkServiceEndpointInput(api, service)
  })

  const newServiceDetails = serviceEndpoints.map((service) => {
    const { id, urls } = service
    return { id, urls, serviceTypes: service.types }
  })

  const rawCreationDetails = {
    did: details.identifier,
    submitter: submitterAddress,
    newKeyAgreementKeys,
    newAttestationKey: newAssertionKey,
    newDelegationKey,
    newServiceDetails,
  }

  const encodedDidCreationDetails = api.registry.createType(
    api.tx.did.create.meta.args[0].type.toString(),
    rawCreationDetails
  )

  const signature = await signer.sign({
    data: encodedDidCreationDetails.toU8a(),
    meta: {},
    publicKey: Crypto.coToUInt8(authenticationKey.publicKey),
    alg: getSigningAlgorithmForVerificationKeyType(authenticationKey.type),
  })
  return api.tx.did.create(encodedDidCreationDetails, {
    [getVerificationKeyTypeForSigningAlgorithm(signature.alg)]: signature.data,
  })
}

/**
 * Create a DID creation operation which includes the information present in the provided DID.
 *
 * The resulting extrinsic can be submitted to create an on-chain DID that has the same keys and service endpoints of the provided DID details.
 *
 * @param did The input DID details.
 * @param submitterAddress The KILT address authorised to submit the creation operation.
 * @param signer The keystore signer.
 *
 * @returns The SubmittableExtrinsic for the DID creation operation.
 */
export async function generateCreateTxFromDidDetails(
  did: DidDetails,
  submitterAddress: IIdentity['address'],
  signer: KeystoreSigner
): Promise<SubmittableExtrinsic> {
  const { authenticationKey } = did
  if (!authenticationKey) {
    throw new SDKErrors.ERROR_DID_ERROR(
      `The provided DID does not have an authentication key to sign the creation operation.`
    )
  }

  const keyAgreementKeys = did.getEncryptionKeys(KeyRelationship.keyAgreement)

  // For now, it only takes the first attestation key, if present.
  const assertionKeys = did.getVerificationKeys(KeyRelationship.assertionMethod)
  if (assertionKeys.length > 1) {
    log.warn(
      `More than one attestation key (${assertionKeys.length}) specified. Only the first will be stored on the chain.`
    )
  }
  const assertionKey = assertionKeys.pop()

  // For now, it only takes the first delegation key, if present.
  const delegationKeys = did.getVerificationKeys(
    KeyRelationship.capabilityDelegation
  )
  if (delegationKeys.length > 1) {
    log.warn(
      `More than one delegation key (${delegationKeys.length}) specified. Only the first will be stored on the chain.`
    )
  }
  const delegationKey = delegationKeys.pop()

  const serviceEndpoints = did.getEndpoints()

  const fullDidCreationDetails: FullDidCreationDetails = {
    identifier: did.identifier,
    authenticationKey,
    keyAgreementKeys,
    assertionKey,
    delegationKey,
    serviceEndpoints,
  }

  return generateCreateTxFromCreationDetails(
    fullDidCreationDetails,
    submitterAddress,
    signer
  )
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
  key: NewDidKey
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const keyAsEnum = formatPublicKey(key)
  switch (keyRelationship) {
    case KeyRelationship.authentication:
      return api.tx.did.setAuthenticationKey(keyAsEnum)
    case KeyRelationship.capabilityDelegation:
      return api.tx.did.setDelegationKey(keyAsEnum)
    case KeyRelationship.assertionMethod:
      return api.tx.did.setAttestationKey(keyAsEnum)
    default:
      throw new SDKErrors.ERROR_DID_ERROR(
        `setting a key is only allowed for the following key types: ${[
          KeyRelationship.authentication,
          KeyRelationship.capabilityDelegation,
          KeyRelationship.assertionMethod,
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
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  switch (keyRelationship) {
    case KeyRelationship.capabilityDelegation:
      return api.tx.did.removeDelegationKey()
    case KeyRelationship.assertionMethod:
      return api.tx.did.removeAttestationKey()
    case KeyRelationship.keyAgreement:
      if (!keyId) {
        throw new SDKErrors.ERROR_DID_ERROR(
          `When removing a ${KeyRelationship.keyAgreement} key it is required to specify the id of the key to be removed.`
        )
      }
      return api.tx.did.removeKeyAgreementKey(keyId)
    default:
      throw new SDKErrors.ERROR_DID_ERROR(
        `key removal is only allowed for the following key types: ${[
          KeyRelationship.keyAgreement,
          KeyRelationship.capabilityDelegation,
          KeyRelationship.assertionMethod,
        ]}`
      )
  }
}

/**
 * Builds an extrinsic to add an additional public key for a given verification relationship if this allows multiple keys in the same role.
 *
 * @param keyRelationship The role or relationship which the new key should have according to the DID specifications (currently only keyAgreement allows multiple keys).
 * @param key Data describing the public key.
 * @returns An extrinsic that must be authorized (signed) by the FullDid whose keys should be changed.
 */
export async function getAddKeyExtrinsic(
  keyRelationship: KeyRelationship,
  key: NewDidKey
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const keyAsEnum = formatPublicKey(key)
  if (keyRelationship === KeyRelationship.keyAgreement) {
    return api.tx.did.addKeyAgreementKey(keyAsEnum)
  }
  throw new SDKErrors.ERROR_DID_ERROR(
    `adding to the key set is only allowed for the following key types:  ${[
      KeyRelationship.keyAgreement,
    ]}`
  )
}

/**
 * Generate an extrinsic to add the provided [[DidServiceEndpoint]] to the authorising DID.
 *
 * @param endpoint The new service endpoint to include in the extrinsic.
 * The service endpoint must respect the following conditions:
 *     - The service endpoint ID is at most 50 ASCII characters long and is a valid URI fragment according to RFC#3986.
 *     - The service endpoint has at most 1 service type, with a value that is at most 50 ASCII characters long.
 *     - The service endpoint has at most 1 URL, with a value that is at most 200 ASCII characters long, and which is a valid URI according to RFC#3986.
 * @returns An extrinsic that must be authorized (signed) by the FullDid with which the service endpoint should be associated.
 */
export async function getAddEndpointExtrinsic(
  endpoint: DidServiceEndpoint
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  checkServiceEndpointInput(api, endpoint)

  return api.tx.did.addServiceEndpoint({
    serviceTypes: endpoint.types,
    ...endpoint,
  })
}

/**
 * Generate an extrinsic to remove the service endpoint with the provided ID from to the state of the authorising DID.
 *
 * @param endpointId The ID of the service endpoint to include in the extrinsic.
 * The ID must be at most 50 ASCII characters long.
 * @returns An extrinsic that must be authorized (signed) by the FullDid associated with the service endpoint to be removed.
 */
export async function getRemoveEndpointExtrinsic(
  endpointId: DidServiceEndpoint['id']
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const maxServiceIdLength = (
    api.consts.did.maxServiceIdLength as u32
  ).toNumber()
  if (endpointId.length > maxServiceIdLength) {
    throw new SDKErrors.ERROR_DID_ERROR(
      `The service ID "${endpointId}" has is too long. Max number of characters allowed for a service ID is ${maxServiceIdLength}.`
    )
  }

  return api.tx.did.removeServiceEndpoint(endpointId)
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
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.delete(endpointsCount)
}

/**
 * Produces an extrinsic to reclaim a deposit paid for storing a FullDid record on the KILT blockchain, resulting in the deletion of that Did.
 *
 * @param didIdentifier Unique identifier of the FullDid (i.e. Minus the prefix kilt:did:).
 * @param endpointsCount The current number of service endpoints associated with the FullDid to be deleted, which is important for the precalculation of the deletion fee.
 * @returns An extrinsic that is to be signed by the payment account owning the deposit, without prior DID authorization.
 */
export async function getReclaimDepositExtrinsic(
  didIdentifier: DidIdentifier,
  endpointsCount: BN
): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.reclaimDeposit(didIdentifier, endpointsCount)
}

/**
 * DID related operations on the KILT blockchain require authorization by a FullDid. This is realized by requiring that relevant extrinsics are signed with a key featured by a FullDid as a verification method.
 * Such extrinsics can be produced using this function.
 *
 * @param params Object wrapping all input to the function.
 * @param params.didIdentifier Unique identifier of the FullDid (i.e. Minus the prefix kilt:did:).
 * @param params.signingPublicKey Public key of the keypair to be used for authorization as hex string or Uint8Array.
 * @param params.alg Identifier of the cryptographic signing algorithm to be used.
 * @param params.signer A signer callback to interface with the key store managing the private key to be used.
 * @param params.call The call or extrinsic to be authorized.
 * @param params.txCounter The nonce or txCounter value for this extrinsic, which must be on larger than the current txCounter value of the authorizing FullDid.
 * @param params.submitter Payment account allowed to submit this extrinsic and cover its fees, which will end up owning any deposit associated with newly created records.
 * @param params.blockNumber Block number for determining the validity period of this authorization. If omitted, the current block number will be fetched from chain.
 * @returns A DID authenticated extrinsic that, after signing with the payment account mentioned in the params, is ready for submission.
 */
export async function generateDidAuthenticatedTx({
  didIdentifier,
  signingPublicKey,
  alg,
  signer,
  call,
  txCounter,
  submitter,
  blockNumber,
}: AuthorizeCallInput & KeystoreSigningOptions): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const signableCall = api.registry.createType<IDidAuthorizedCallOperation>(
    api.tx.did.submitDidCall.meta.args[0].type.toString(),
    {
      txCounter,
      did: didIdentifier,
      call,
      submitter,
      blockNumber: blockNumber || (await api.query.system.number()),
    }
  )
  const signature = await signer.sign({
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
  return api.tx.did.submitDidCall(signableCall, {
    [getVerificationKeyTypeForSigningAlgorithm(signature.alg)]: signature.data,
  })
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
  key: Pick<ChainDidKey, 'type'>,
  signature: Pick<DidSignature, 'signature'>
): SignatureEnum {
  if (!Object.values(VerificationKeyType).some((kt) => kt === key.type)) {
    throw new SDKErrors.ERROR_DID_ERROR(
      `encodedDidSignature requires a verification key. A key of type "${key.type}" was used instead.`
    )
  }
  const alg = getSigningAlgorithmForVerificationKeyType(
    key.type as VerificationKeyType
  )
  return {
    [alg]: hexToU8a(signature.signature),
  }
}
