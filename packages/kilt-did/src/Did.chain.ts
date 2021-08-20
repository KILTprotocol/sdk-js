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

import type { Option } from '@polkadot/types'
import type {
  IIdentity,
  SubmittableExtrinsic,
  IDidKeyDetails,
  KeystoreSigningOptions,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { Crypto } from '@kiltprotocol/utils'
import type { Extrinsic, Hash } from '@polkadot/types/interfaces'
import type { Codec } from '@polkadot/types/types'
import { BN } from '@polkadot/util'
import type {
  Url,
  UrlEncoding,
  IAuthorizeCallOptions,
  IDidCreationOptions,
  IDidChainRecordJSON,
  DidPublicKeyDetails,
  INewPublicKey,
  IDidChainRecordCodec,
  EndpointData,
} from './types'
import {
  encodeDidAuthorizedCallOperation,
  encodeDidCreationOperation,
  getKiltDidFromIdentifier,
  getIdentifierFromKiltDid,
  formatPublicKey,
  encodeEndpointUrl,
} from './Did.utils'

// ### QUERYING

export async function queryEncoded(
  didIdentifier: IIdentity['address']
): Promise<Option<IDidChainRecordCodec>> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.query.did.did<Option<IDidChainRecordCodec>>(
    didIdentifier
  )
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

function decodeEndpointUrl(url: Url): string {
  return (url.value as UrlEncoding).payload.toString()
}

function decodeDidChainRecord(didDetail: IDidChainRecordCodec, did: string) {
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
  if (didDetail.serviceEndpoints.isSome) {
    const endpointData = didDetail.serviceEndpoints.unwrap()
    didRecord.endpointData = {
      urls: endpointData.urls.map((e) => decodeEndpointUrl(e)),
      contentType: endpointData.contentType.type,
      contentHash: endpointData.contentHash.toHex(),
    }
  }
  if (didDetail.capabilityDelegationKey.isSome) {
    didRecord.capabilityDelegationKey = assembleKeyId(
      didDetail.capabilityDelegationKey.unwrap(),
      did
    )
  }
  if (didDetail.assertionMethodKey.isSome) {
    didRecord.assertionMethodKey = assembleKeyId(
      didDetail.assertionMethodKey.unwrap(),
      did
    )
  }
  return didRecord
}

export async function queryById(
  didIdentifier: IIdentity['address']
): Promise<IDidChainRecordJSON | null> {
  const result = await queryEncoded(didIdentifier)
  if (result.isSome) {
    return decodeDidChainRecord(
      result.unwrap(),
      getKiltDidFromIdentifier(didIdentifier)
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
  const encoded = await queryEncoded(getIdentifierFromKiltDid(did))
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

export async function queryLastTxIndex(did: string): Promise<BN> {
  const encoded = await queryEncoded(getIdentifierFromKiltDid(did))
  if (encoded.isNone) return new BN(0)
  return encoded.unwrap().lastTxCounter.toBn()
}

// ### EXTRINSICS

export async function generateCreateTx({
  signer,
  signingPublicKey,
  alg,
  didIdentifier,
  keys = {},
  endpointData,
}: IDidCreationOptions & KeystoreSigningOptions): Promise<
  SubmittableExtrinsic
> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeDidCreationOperation(blockchain.api.registry, {
    didIdentifier,
    keys,
    endpointData,
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

export async function getSetEndpointDataExtrinsic({
  urls,
  contentHash,
  contentType,
}: EndpointData): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.setServiceEndpoints({
    urls: urls.map((url) => encodeEndpointUrl(url)),
    contentHash,
    contentType,
  })
}

export async function getRemoveEndpointDataExtrinsic(): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.removeServiceEndpoints()
}

export async function getDeleteDidExtrinsic(): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.delete()
}

export async function generateDidAuthenticatedTx({
  signingPublicKey,
  alg,
  signer,
  txCounter,
  didIdentifier,
  call,
}: IAuthorizeCallOptions & KeystoreSigningOptions): Promise<
  SubmittableExtrinsic
> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const signableCall = encodeDidAuthorizedCallOperation(
    blockchain.api.registry,
    { txCounter, didIdentifier, call }
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
