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

import type { Option, u32 } from '@polkadot/types'
import type {
  IIdentity,
  SubmittableExtrinsic,
  IDidKeyDetails,
  IDidServiceEndpoint,
  KeystoreSigningOptions,
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
  getIdentifierFromKiltDid,
  formatPublicKey,
  encodeServiceEndpoint,
} from './Did.utils'

// ### QUERYING

export async function queryDidEncoded(
  didIdentifier: IIdentity['address']
): Promise<Option<IDidChainRecordCodec>> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.query.did.did<Option<IDidChainRecordCodec>>(
    didIdentifier
  )
}

export async function queryServiceEncoded(
  didIdentifier: IIdentity['address'],
  serviceId: IDidServiceEndpoint['id']
): Promise<Option<IServiceEndpointChainRecordCodec>> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.query.did.serviceEndpoints<
    Option<IServiceEndpointChainRecordCodec>
  >(didIdentifier, serviceId)
}

export async function queryAllServicesEncoded(
  didIdentifier: IIdentity['address']
): Promise<IServiceEndpointChainRecordCodec[]> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const endpoints = await blockchain.api.query.did.serviceEndpoints.entries<
    Option<IServiceEndpointChainRecordCodec>
  >(didIdentifier)
  return endpoints.map(([, value]) => value.unwrap())
}

function assembleKeyId(keyId: Codec, did: string): string {
  return `${did}#${keyId.toHex()}`
}

function decodeDidPublicKeyDetails(
  did: string,
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

function decodeDidChainRecord(
  didDetail: IDidChainRecordCodec,
  did: string
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

function decodeServiceChainRecord(
  serviceDetails: IServiceEndpointChainRecordCodec,
  did: string
): IDidServiceEndpoint {
  const decodedId = hexToString(serviceDetails.id.toString())
  return {
    id: `${did}#${decodedId}`,
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
  if (result.isSome) {
    return decodeDidChainRecord(
      result.unwrap(),
      getKiltDidFromIdentifier(didIdentifier, 'full')
    )
  }
  return null
}

export async function queryByDID(
  did: IDidChainRecordJSON['did']
): Promise<IDidChainRecordJSON | null> {
  // we will have to extract the id part from the did string
  const didId = getIdentifierFromKiltDid(did)
  return queryById(didId)
}

export async function queryKey(
  did: string,
  keyId: string
): Promise<IDidKeyDetails | null> {
  const encoded = await queryDidEncoded(getIdentifierFromKiltDid(did))
  if (encoded.isNone) return null
  const keyIdU8a = Crypto.coToUInt8(keyId)
  let key: IDidKeyDetails | null = null
  encoded.unwrap().publicKeys.forEach((keyDetails, id) => {
    if (id.eq(keyIdU8a)) {
      key = decodeDidPublicKeyDetails(did, id, keyDetails)
    }
  })
  return key
}

export async function queryServiceEndpoint(
  did: string,
  serviceId: string
): Promise<IDidServiceEndpoint | null> {
  const encoded = await queryServiceEncoded(
    getIdentifierFromKiltDid(did),
    serviceId
  )
  if (encoded.isNone) return null

  return decodeServiceChainRecord(encoded.unwrap(), did)
}

export async function queryServiceEndpoints(
  did: string
): Promise<IDidServiceEndpoint[]> {
  const encoded = await queryAllServicesEncoded(getIdentifierFromKiltDid(did))
  return encoded.map((e) => decodeServiceChainRecord(e, did))
}

export async function queryEndpointsCounts(did: string): Promise<number> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const count = await blockchain.api.query.did.didEndpointsCount<u32>(
    getIdentifierFromKiltDid(did)
  )
  return count.toNumber()
}

export async function queryLastTxIndex(did: string): Promise<BN> {
  const identifier = getIdentifierFromKiltDid(did)
  const encoded = await queryDidEncoded(identifier)
  if (encoded.isNone) return new BN(0)
  return encoded.unwrap().lastTxCounter.toBn()
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
}: IDidCreationOptions & KeystoreSigningOptions): Promise<
  SubmittableExtrinsic
> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeDidCreationOperation(blockchain.api.registry, {
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
  return blockchain.api.tx.did.create(encoded, {
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
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeServiceEndpoint(blockchain.api.registry, endpoint)
  return blockchain.api.tx.did.addServiceEndpoint(encoded)
}

export async function getRemoveEndpointExtrinsic(
  endpointId: IDidServiceEndpoint['id']
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.removeServiceEndpoint(endpointId)
}

export async function getDeleteDidExtrinsic({
  endpointsCount,
  did,
}: {
  endpointsCount?: number
  did?: string
}): Promise<Extrinsic> {
  if (!endpointsCount && !did) {
    throw new Error('One of enpointsCount or did must be specified.')
  }
  const number = endpointsCount || (await queryEndpointsCounts(did!))
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.delete(number)
}

export async function getReclaimDepositExtrinsic(
  identifier: IIdentity['address'],
  endpointsCount?: number
): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const number =
    endpointsCount ||
    (await queryEndpointsCounts(getKiltDidFromIdentifier(identifier!, 'full')))
  return api.tx.did.reclaimDeposit(identifier, number)
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
}: AuthenticationTxCreationInput & KeystoreSigningOptions): Promise<
  SubmittableExtrinsic
> {
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
      transactionVersion: blockchain.api.runtimeVersion.transactionVersion.toString(),
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
