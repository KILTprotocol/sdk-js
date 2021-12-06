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
  DidKey,
  DidServiceEndpoint,
  KeystoreSigningOptions,
  IDidDetails,
  IDidIdentifier,
  DidPublicKey,
  DidPublicServiceEndpoint,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { Crypto } from '@kiltprotocol/utils'
import type { Extrinsic, Hash } from '@polkadot/types/interfaces'
import type { Codec } from '@polkadot/types/types'
import { BN, hexToString } from '@polkadot/util'
import type {
  AuthenticationTxCreationInput,
  IDidChainRecordJSON,
  DidPublicKeyDetails,
  INewPublicKey,
  IDidChainRecordCodec,
  IServiceEndpointChainRecordCodec,
  PublicKeyEnum,
  IDidCreationDetails,
  IDidAuthorizedCallOperation,
} from './types'
import {
  formatPublicKey,
  getKiltDidFromIdentifier,
  parseDidUrl,
} from './Did.utils'
import { DidDetails } from './DidDetails/DidDetails'

// ### RAW QUERYING (lowest layer)

// Query a full DID given the identifier (a KILT address for v1).
// Interacts with the Did storage map.
export async function queryDidEncoded(
  didIdentifier: IDidIdentifier
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
  didIdentifier: IDidIdentifier
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
  didIdentifier: IDidIdentifier,
  serviceId: string
): Promise<Option<IServiceEndpointChainRecordCodec>> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.serviceEndpoints<
    Option<IServiceEndpointChainRecordCodec>
  >(didIdentifier, serviceId)
}

// Query all services for a DID given the DID identifier.
// Interacts with the ServiceEndpoints storage double map.
export async function queryAllServicesEncoded(
  didIdentifier: IDidIdentifier
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
  didIdentifier: IDidIdentifier
): Promise<u32> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.didEndpointsCount<u32>(didIdentifier)
}

async function queryDepositAmountEncoded(): Promise<U128> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.consts.did.deposit as U128
}

// ### DECODED QUERYING (builds on top of raw querying)

function decodeDidPublicKeyDetails(
  keyId: Hash,
  keyDetails: DidPublicKeyDetails
): DidKey {
  const { key, blockNumber } = keyDetails
  return {
    id: keyId.toHex(),
    type: key.type.toLowerCase(),
    publicKey: key.value.toU8a(),
    includedAt: blockNumber.toNumber(),
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
    lastTxCounter: didDetail.lastTxCounter,
  }
  if (didDetail.delegationKey.isSome) {
    didRecord.capabilityDelegationKey = didDetail.delegationKey.unwrap().toHex()
  }
  if (didDetail.attestationKey.isSome) {
    didRecord.assertionMethodKey = didDetail.attestationKey.unwrap().toHex()
  }
  return didRecord
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

export async function queryById(
  didIdentifier: IDidIdentifier
): Promise<IDidChainRecordJSON | null> {
  const result = await queryDidEncoded(didIdentifier)
  if (result.isNone) {
    return null
  }
  return decodeDidChainRecord(result.unwrap())
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
  keyUri: DidPublicKey['id']
): Promise<DidKey | null> {
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
  return didDetails.publicKeys.find((key) => key.id === fragment) || null
}

export async function queryServiceEndpoints(
  didUri: IDidDetails['did']
): Promise<DidServiceEndpoint[]> {
  const { identifier, fragment } = parseDidUrl(didUri)
  if (fragment) {
    throw new Error(`The provided URI ${didUri} must not contain any fragment.`)
  }
  const encoded = await queryAllServicesEncoded(identifier)
  return encoded.map((e) => decodeServiceChainRecord(e))
}

export async function queryServiceEndpoint(
  serviceUri: DidPublicServiceEndpoint['id']
): Promise<DidServiceEndpoint | null> {
  const { identifier, fragment } = parseDidUrl(serviceUri)
  if (!fragment) {
    throw new Error(
      `The provided URI ${serviceUri} does not contain a valid fragment for service ID.`
    )
  }
  const serviceEncoded = await queryServiceEncoded(identifier, fragment)
  if (serviceEncoded.isNone) return null

  return decodeServiceChainRecord(serviceEncoded.unwrap())
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

export async function generateCreateTxFromDidDetails(
  did: DidDetails,
  submitterAddress: IIdentity['address'],
  signingOptions: KeystoreSigningOptions
): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const { signer, signingPublicKey, alg } = signingOptions

  const newKeyAgreementKeys: PublicKeyEnum[] = did
    .getKeys(KeyRelationship.keyAgreement)
    .map((key) => {
      return formatPublicKey(key)
    })

  // For now, it only takes the first attestation key, if present.
  const newAttestationKey: PublicKeyEnum | undefined =
    did
      .getKeys(KeyRelationship.assertionMethod)
      .map((key) => {
        return formatPublicKey(key)
      })
      .pop() || undefined

  // For now, it only takes the first delegation key, if present.
  const newDelegationKey: PublicKeyEnum | undefined =
    did
      .getKeys(KeyRelationship.capabilityDelegation)
      .map((key) => {
        return formatPublicKey(key)
      })
      .pop() || undefined

  const newServiceDetails = did.getEndpoints().map((service) => {
    const { id, urls } = service
    return { id, urls, serviceTypes: service.types }
  })

  const rawCreationDetails = {
    did: did.identifier,
    submitter: submitterAddress,
    newKeyAgreementKeys,
    newAttestationKey,
    newDelegationKey,
    newServiceDetails,
  }

  const encodedDidCreationDetails =
    new (api.registry.getOrThrow<IDidCreationDetails>(
      'DidDidDetailsDidCreationDetails'
    ))(api.registry, rawCreationDetails)

  const signature = await signer.sign({
    data: encodedDidCreationDetails.toU8a(),
    meta: {},
    publicKey: Crypto.coToUInt8(signingPublicKey),
    alg,
  })
  return api.tx.did.create(encodedDidCreationDetails, {
    [signature.alg]: signature.data,
  })
}

export async function generateCreateTxFromCreationDetails(
  creationDetails: Omit<DidCreationDetails, 'did'> & { id: IDidIdentifier },
  submitterAddress: IIdentity['address'],
  signingOptions: KeystoreSigningOptions
): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const { signer, signingPublicKey, alg } = signingOptions

  const newKeyAgreementKeysIds: Array<DidKey['id']> =
    creationDetails.keyRelationships.keyAgreement || []
  const newAttestationKeyId: DidKey['id'] | undefined =
    creationDetails.keyRelationships.assertionMethod?.pop()
  const newDelegationKeyId: DidKey['id'] | undefined =
    creationDetails.keyRelationships.capabilityDelegation?.pop()

  // For now, we only take one attestation and one delegation key.
  const newKeyAgreementKeys: PublicKeyEnum[] = newKeyAgreementKeysIds.map(
    (keyId) => {
      const { type, publicKey } = creationDetails.keys.get(keyId) as DidKey
      return formatPublicKey({ id: keyId, type, publicKey })
    }
  )

  let newAttestationKey: PublicKeyEnum | undefined
  if (newAttestationKeyId) {
    const { type, publicKey } = creationDetails.keys.get(
      newAttestationKeyId
    ) as DidKey
    newAttestationKey = formatPublicKey({
      id: newAttestationKeyId,
      type,
      publicKey,
    })
  }

  let newDelegationKey: PublicKeyEnum | undefined
  if (newDelegationKeyId) {
    const { type, publicKey } = creationDetails.keys.get(
      newDelegationKeyId
    ) as DidKey
    newDelegationKey = formatPublicKey({
      id: newDelegationKeyId,
      type,
      publicKey,
    })
  }

  const newServiceDetails = creationDetails.serviceEndpoints.map((service) => {
    const { id, urls } = service
    return { id, urls, serviceTypes: service.types }
  })

  const rawCreationDetails = {
    did: creationDetails.id,
    submitter: submitterAddress,
    newKeyAgreementKeys,
    newAttestationKey,
    newDelegationKey,
    newServiceDetails,
  }

  const encodedDidCreationDetails =
    new (api.registry.getOrThrow<IDidCreationDetails>(
      'DidDidDetailsDidCreationDetails'
    ))(api.registry, rawCreationDetails)

  const signature = await signer.sign({
    data: encodedDidCreationDetails.toU8a(),
    meta: {},
    publicKey: Crypto.coToUInt8(signingPublicKey),
    alg,
  })
  return api.tx.did.create(encodedDidCreationDetails, {
    [signature.alg]: signature.data,
  })
}

export async function getSetKeyExtrinsic(
  keyRelationship: KeyRelationship,
  key: Omit<INewPublicKey, 'id'> & { id: string }
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
  key: Omit<DidKey, 'includedAt'>
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const keyAsEnum = formatPublicKey(key)
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
  endpoint: DidServiceEndpoint
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const encodedEndpoint =
    new (api.registry.getOrThrow<IServiceEndpointChainRecordCodec>(
      'DidServiceEndpointsDidEndpoint'
    ))(api.registry, {
      id: endpoint.id,
      serviceTypes: endpoint.types,
      urls: endpoint.urls,
    })
  return api.tx.did.addServiceEndpoint(encodedEndpoint)
}

// The endpointId parameter is the service endpoint ID without the DID prefix.
// So for a endpoint of the form did:kilt:<identifier>#<endpoint_id>, only <endpoint_id> must be passed as parameter here.
export async function getRemoveEndpointExtrinsic(
  endpointId: DidServiceEndpoint['id']
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

export async function getReclaimDepositExtrinsic(
  didIdentifier: IDidIdentifier,
  endpointsCount: number
): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.reclaimDeposit(didIdentifier, endpointsCount)
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
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const block = blockNumber || (await api.query.system.number())
  const signableCall =
    new (api.registry.getOrThrow<IDidAuthorizedCallOperation>(
      'DidAuthorizedCallOperation'
    ))(api.registry, {
      txCounter,
      didIdentifier,
      call,
      submitter,
      blockNumber: block,
    })
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
    [signature.alg]: signature.data,
  })
}
