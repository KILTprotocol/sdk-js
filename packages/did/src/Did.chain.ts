/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module DID
 */

import type { Option, u32, U128, GenericAccountId } from '@polkadot/types'
import type {
  IIdentity,
  SubmittableExtrinsic,
  IDidKeyDetails,
  IDidServiceEndpoint,
  KeystoreSigningOptions,
  IDidDetails,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { Crypto } from '@kiltprotocol/utils'
import type { Extrinsic, Hash } from '@polkadot/types/interfaces'
import type { Codec } from '@polkadot/types/types'
import { BN, hexToString } from '@polkadot/util'
import type {
  AuthenticationTxCreationInput,
  IDidCreationOptions,
  IDidChainRecordJSON,
  DidPublicKeyDetails,
  INewPublicKey,
  IDidChainRecordCodec,
  IServiceEndpointChainRecordCodec,
} from './types'
import {
  encodeDidAuthorizedCallOperation,
  encodeDidCreationOperation,
  getKiltDidFromIdentifier,
  formatPublicKey,
  encodeServiceEndpoint,
  parseDidUrl,
  assembleDidFragment,
} from './Did.utils.js'

// ### RAW QUERYING (lowest layer)

// Query a full DID given the identifier (a KILT address for v1).
// Interacts with the Did storage map.
export async function queryDidEncoded(
  didIdentifier: IIdentity['address']
): Promise<Option<IDidChainRecordCodec>> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.did<Option<IDidChainRecordCodec>>(didIdentifier)
}

// Query ALL deleted DIDs, which can be very time consuming if the number of deleted DIDs gets large.
export async function queryDeletedDidsEncoded(): Promise<GenericAccountId[]> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  // Query all the storage keys, and then only take the relevant property, i.e., the encoded DID identifier.
  return api.query.did.didBlacklist
    .keys<GenericAccountId[]>()
    .then((entries) =>
      entries.map(({ args: [encodedDidIdentifier] }) => encodedDidIdentifier)
    )
}

// Returns the raw representation of the storage entry for the given DID identifier.
async function queryDidDeletionStatusEncoded(
  didIdentifier: IIdentity['address']
): Promise<Uint8Array> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const encodedStorageKey = await api.query.did.didBlacklist.key(didIdentifier)
  return (
    api.rpc.state
      .queryStorageAt<Codec[]>([encodedStorageKey])
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .then((encodedValue) => encodedValue.pop()!.toU8a())
  )
}

// Query a DID service given the DID identifier and the service ID.
// Interacts with the ServiceEndpoints storage double map.
export async function queryServiceEncoded(
  didIdentifier: IIdentity['address'],
  serviceId: IDidServiceEndpoint['id']
): Promise<Option<IServiceEndpointChainRecordCodec>> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.serviceEndpoints<
    Option<IServiceEndpointChainRecordCodec>
  >(didIdentifier, serviceId)
}

// Query all services for a DID given the DID identifier.
// Interacts with the ServiceEndpoints storage double map.
export async function queryAllServicesEncoded(
  didIdentifier: IIdentity['address']
): Promise<IServiceEndpointChainRecordCodec[]> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const encodedEndpoints = await api.query.did.serviceEndpoints.entries<
    Option<IServiceEndpointChainRecordCodec>
  >(didIdentifier)
  return encodedEndpoints.map(([, encodedValue]) => encodedValue.unwrap())
}

// Query the # of services stored under a DID without fetching all the services.
// Interacts with the DidEndpointsCount storage map.
export async function queryEndpointsCountsEncoded(
  didIdentifier: IIdentity['address']
): Promise<u32> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.didEndpointsCount<u32>(didIdentifier)
}

async function queryDepositAmountEncoded(): Promise<U128> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.consts.did.deposit as U128
}

// ### DECODED QUERYING (builds on top of raw querying)

// This should not be part of this layer, as it has knowledge of DID URI.
// This level should only be concerned with IDs.
// Building DID URIs from IDs should be a concern of a higher level, so
// we might want to refactor this in the future when time pressure is off.
function assembleKeyId(keyId: Codec, did: IDidDetails['did']): string {
  return `${did}#${keyId.toHex()}`
}

function decodeDidPublicKeyDetails(
  did: IDidDetails['did'],
  keyId: Hash,
  keyDetails: DidPublicKeyDetails
): IDidKeyDetails {
  const key = keyDetails.key.value
  return {
    id: assembleKeyId(keyId, did),
    type: key.type.toLowerCase(),
    controller: did,
    publicKeyHex: key.value.toHex(),
    includedAt: keyDetails.blockNumber.toNumber(),
  }
}

// Same reasoning as `assembleKeyId`.
function decodeDidChainRecord(
  didDetail: IDidChainRecordCodec,
  did: IDidDetails['did']
): IDidChainRecordJSON {
  const publicKeys: IDidKeyDetails[] = Array.from(
    didDetail.publicKeys.entries()
  ).map(([keyId, keyDetails]) => {
    return decodeDidPublicKeyDetails(did, keyId, keyDetails)
  })
  const authenticationKeyId = assembleKeyId(didDetail.authenticationKey, did)
  const keyAgreementKeyIds = Array.from(
    didDetail.keyAgreementKeys.values()
  ).map((id) => assembleKeyId(id, did))

  const didRecord: IDidChainRecordJSON = {
    did,
    publicKeys,
    authenticationKey: authenticationKeyId,
    keyAgreementKeys: keyAgreementKeyIds,
    lastTxCounter: didDetail.lastTxCounter,
  }
  if (didDetail.delegationKey.isSome) {
    didRecord.capabilityDelegationKey = assembleKeyId(
      didDetail.delegationKey.unwrap(),
      did
    )
  }
  if (didDetail.attestationKey.isSome) {
    didRecord.assertionMethodKey = assembleKeyId(
      didDetail.attestationKey.unwrap(),
      did
    )
  }
  return didRecord
}

// Same reasoning as `assembleKeyId`.
function decodeServiceChainRecord(
  serviceDetails: IServiceEndpointChainRecordCodec,
  did: IDidDetails['did']
): IDidServiceEndpoint {
  const decodedId = hexToString(serviceDetails.id.toString())
  return {
    id: assembleDidFragment(did, decodedId),
    types: serviceDetails.serviceTypes.map((type) =>
      hexToString(type.toString())
    ),
    urls: serviceDetails.urls.map((url) => hexToString(url.toString())),
  }
}

export async function queryById(
  didIdentifier: IIdentity['address']
): Promise<IDidChainRecordJSON | null> {
  const result = await queryDidEncoded(didIdentifier)
  if (result.isNone) {
    return null
  }
  return decodeDidChainRecord(
    result.unwrap(),
    getKiltDidFromIdentifier(didIdentifier, 'full')
  )
}

// Query full DID details given the DID URI.
export async function queryDidDetails(
  didUri: IDidDetails['did']
): Promise<IDidChainRecordJSON | null> {
  const { identifier, fragment } = parseDidUrl(didUri)
  if (fragment) {
    throw new Error(`The provided URI ${didUri} must not contain any fragment.`)
  }
  return queryById(identifier)
}

// Query a given key given the DID identifier and the key ID.
export async function queryDidKey(
  keyUri: IDidKeyDetails['id']
): Promise<IDidKeyDetails | null> {
  const { identifier, fragment } = parseDidUrl(keyUri)
  if (!fragment) {
    throw new Error(
      `The provided URI ${keyUri} does not contain a valid fragment for key ID.`
    )
  }
  const didDetails = await queryById(identifier)
  if (!didDetails) {
    return null
  }
  return didDetails.publicKeys.find((key) => key.id === keyUri) || null
}

export async function queryServiceEndpoints(
  didUri: IDidDetails['did']
): Promise<IDidServiceEndpoint[]> {
  const { identifier, fragment } = parseDidUrl(didUri)
  if (fragment) {
    throw new Error(`The provided URI ${didUri} must not contain any fragment.`)
  }
  const encoded = await queryAllServicesEncoded(identifier)
  return encoded.map((e) => decodeServiceChainRecord(e, didUri))
}

export async function queryServiceEndpoint(
  serviceUri: IDidServiceEndpoint['id']
): Promise<IDidServiceEndpoint | null> {
  const { identifier, fragment } = parseDidUrl(serviceUri)
  if (!fragment) {
    throw new Error(
      `The provided URI ${serviceUri} does not contain a valid fragment for service ID.`
    )
  }
  const serviceEncoded = await queryServiceEncoded(identifier, fragment)
  if (serviceEncoded.isNone) return null

  const didUri = getKiltDidFromIdentifier(identifier, 'full')

  return decodeServiceChainRecord(serviceEncoded.unwrap(), didUri)
}

export async function queryEndpointsCounts(
  didUri: IDidDetails['did']
): Promise<number> {
  const { identifier, fragment } = parseDidUrl(didUri)
  if (fragment) {
    throw new Error(`The provided URI ${didUri} must not contain any fragment.`)
  }
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const count = await blockchain.api.query.did.didEndpointsCount<u32>(
    identifier
  )
  return count.toNumber()
}

export async function queryLastTxCounter(
  didUri: IDidDetails['did']
): Promise<BN> {
  const { identifier, fragment } = parseDidUrl(didUri)
  if (fragment) {
    throw new Error(`The provided URI ${didUri} must not contain any fragment.`)
  }
  const encoded = await queryDidEncoded(identifier)
  return encoded.isSome ? encoded.unwrap().lastTxCounter.toBn() : new BN(0)
}

export async function queryDepositAmount(): Promise<BN> {
  const encodedDeposit = await queryDepositAmountEncoded()
  return encodedDeposit.toBn()
}

export async function queryDeletedDids(): Promise<Array<IDidDetails['did']>> {
  const encodedIdentifiers = await queryDeletedDidsEncoded()
  return encodedIdentifiers.map((id) =>
    getKiltDidFromIdentifier(id.toHuman(), 'full')
  )
}

export async function queryDidDeletionStatus(
  didUri: IDidDetails['did']
): Promise<boolean> {
  const { identifier } = parseDidUrl(didUri)
  const encodedDeletionStorageEntry = await queryDidDeletionStatusEncoded(
    identifier
  )
  // The result is a 1-byte array where the only element is 1 if the DID has been deleted, and 0 otherwise.
  return encodedDeletionStorageEntry[0] === 1
}

// ### EXTRINSICS

export async function generateCreateTx({
  signer,
  signingPublicKey,
  alg,
  didIdentifier,
  submitter,
  keys = {},
  endpoints = [],
}: IDidCreationOptions &
  KeystoreSigningOptions): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeDidCreationOperation(api.registry, {
    didIdentifier,
    submitter,
    keys,
    endpoints,
  })
  const signature = await signer.sign({
    data: encoded.toU8a(),
    meta: {},
    publicKey: Crypto.coToUInt8(signingPublicKey),
    alg,
  })
  return api.tx.did.create(encoded, {
    [signature.alg]: signature.data,
  })
}

export async function getSetKeyExtrinsic(
  keyRelationship: KeyRelationship,
  key: INewPublicKey
): Promise<Extrinsic> {
  const keyAsEnum = formatPublicKey(key)
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  switch (keyRelationship) {
    case KeyRelationship.authentication:
      return api.tx.did.setAuthenticationKey(keyAsEnum)
    case KeyRelationship.capabilityDelegation:
      return api.tx.did.setDelegationKey(keyAsEnum)
    case KeyRelationship.assertionMethod:
      return api.tx.did.setAttestationKey(keyAsEnum)
    default:
      throw new Error(
        `setting a key is only allowed for the following key types: ${[
          KeyRelationship.authentication,
          KeyRelationship.capabilityDelegation,
          KeyRelationship.assertionMethod,
        ]}`
      )
  }
}

export async function getRemoveKeyExtrinsic(
  keyRelationship: KeyRelationship,
  keyId?: string
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  switch (keyRelationship) {
    case KeyRelationship.capabilityDelegation:
      return api.tx.did.removeDelegationKey()
    case KeyRelationship.assertionMethod:
      return api.tx.did.removeAttestationKey()
    case KeyRelationship.keyAgreement:
      if (!keyId) {
        throw new Error(
          `When removing a ${KeyRelationship.keyAgreement} key it is required to specify the id of the key to be removed.`
        )
      }
      return api.tx.did.removeKeyAgreementKey(keyId)
    default:
      throw new Error(
        `key removal is only allowed for the following key types: ${[
          KeyRelationship.keyAgreement,
          KeyRelationship.capabilityDelegation,
          KeyRelationship.assertionMethod,
        ]}`
      )
  }
}

export async function getAddKeyExtrinsic(
  keyRelationship: KeyRelationship,
  key: INewPublicKey
): Promise<Extrinsic> {
  const keyAsEnum = formatPublicKey(key)
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  if (keyRelationship === KeyRelationship.keyAgreement) {
    return api.tx.did.addKeyAgreementKey(keyAsEnum)
  }
  throw new Error(
    `adding to the key set is only allowed for the following key types:  ${[
      KeyRelationship.keyAgreement,
    ]}`
  )
}

export async function getAddEndpointExtrinsic(
  endpoint: IDidServiceEndpoint
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeServiceEndpoint(api.registry, endpoint)
  return api.tx.did.addServiceEndpoint(encoded)
}

// The endpointId parameter is the service endpoint ID without the DID prefix.
// So for a endpoint of the form did:kilt:<identifier>#<endpoint_id>, only <endpoint_id> must be passed as parameter here.
export async function getRemoveEndpointExtrinsic(
  endpointId: string
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.removeServiceEndpoint(endpointId)
}

export async function getDeleteDidExtrinsic(
  endpointsCount: number
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.delete(endpointsCount)
}

export async function getgetReclaimDepositTxExtrinsic(
  didIdentifier: IIdentity['address'],
  endpointsCount: number
): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.getReclaimDepositTx(didIdentifier, endpointsCount)
}

// The block number can either be provided by the DID subject,
// or the latest one will automatically be fetched from the blockchain.
export async function generateDidAuthenticatedTx({
  signingPublicKey,
  alg,
  signer,
  txCounter,
  didIdentifier,
  call,
  submitter,
  blockNumber,
}: AuthenticationTxCreationInput &
  KeystoreSigningOptions): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const block = blockNumber || (await blockchain.api.query.system.number())
  const signableCall = encodeDidAuthorizedCallOperation(
    blockchain.api.registry,
    { txCounter, didIdentifier, call, submitter, blockNumber: block }
  )
  const signature = await signer.sign({
    data: signableCall.toU8a(),
    meta: {
      method: call.method.toHex(),
      version: call.version,
      specVersion: blockchain.api.runtimeVersion.specVersion.toString(),
      transactionVersion:
        blockchain.api.runtimeVersion.transactionVersion.toString(),
      genesisHash: blockchain.api.genesisHash.toHex(),
      nonce: signableCall.txCounter.toHex(),
      address: Crypto.encodeAddress(signableCall.did),
    },
    publicKey: Crypto.coToUInt8(signingPublicKey),
    alg,
  })
  return blockchain.api.tx.did.submitDidCall(signableCall, {
    [signature.alg]: signature.data,
  })
}
