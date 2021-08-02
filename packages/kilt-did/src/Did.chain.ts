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
import type { IIdentity, SubmittableExtrinsic } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type { IDid } from '@kiltprotocol/core'
import { Crypto } from '@kiltprotocol/utils'
import type {
  DidDetails,
  DidEncryptionKey,
  DidVerificationKey,
  Url,
  UrlEncoding,
  IAuthorizeCallOptions,
  IDidCreationOptions,
  IDidDeletionOptions,
  IDidRecord,
  IDidUpdateOptions,
  KeyDetails,
  KeypairType,
  TypedPublicKey,
  KeystoreSigningOptions,
} from './types'
import {
  encodeDidAuthorizedCallOperation,
  encodeDidCreationOperation,
  encodeDidDeletionOperation,
  encodeDidUpdateOperation,
  getDidFromIdentifier,
  getIdentifierFromDid,
} from './Did.utils'

export async function queryEncoded(
  didIdentifier: IIdentity['address']
): Promise<Option<DidDetails>> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.query.did.did<Option<DidDetails>>(didIdentifier)
}

function decodePublicKey(
  key: DidVerificationKey | DidEncryptionKey
): TypedPublicKey {
  return {
    type: key.type as KeypairType,
    publicKeyHex: key.value.toHex(),
  }
}

function decodeEndpointUrl(url: Url): string {
  return (url.value as UrlEncoding).payload.toString()
}

export async function queryById(
  didIdentifier: IIdentity['address']
): Promise<IDidRecord | null> {
  const result = await queryEncoded(didIdentifier)
  result.unwrapOr(null)
  if (result.isSome) {
    const didDetail = result.unwrap()
    const publicKeys: KeyDetails[] = Array.from(
      didDetail.publicKeys.entries()
    ).map(([keyId, keyDetails]) => {
      return {
        ...decodePublicKey(keyDetails.key.value),
        id: keyId.toHex(),
        includedAt: keyDetails.blockNumber.toNumber(),
      }
    })
    const authenticationKeyId = didDetail.authenticationKey.toHex()
    const keyAgreementKeyIds = Array.from(
      didDetail.keyAgreementKeys.values()
    ).map((id) => id.toHex())

    const didRecord: IDidRecord = {
      did: getDidFromIdentifier(didIdentifier),
      publicKeys,
      authenticationKey: authenticationKeyId,
      keyAgreementKeys: keyAgreementKeyIds,
      lastTxCounter: didDetail.lastTxCounter,
    }
    if (didDetail.endpointUrl.isSome) {
      didRecord.endpointUrl = decodeEndpointUrl(didDetail.endpointUrl.unwrap())
    }
    if (didDetail.delegationKey.isSome) {
      didRecord.delegationKey = didDetail.delegationKey.unwrap().toHex()
    }
    if (didDetail.attestationKey.isSome) {
      didRecord.attestationKey = didDetail.attestationKey.unwrap().toHex()
    }
    return didRecord
  }
  return null
}

export async function queryByDID(
  did: IDid['identifier']
): Promise<IDidRecord | null> {
  // we will have to extract the id part from the did string
  const didId = getIdentifierFromDid(did)
  return queryById(didId)
}

export async function generateCreateTx({
  signer,
  signingKeyId,
  alg,
  didIdentifier,
  keys,
  endpointUrl,
}: IDidCreationOptions & KeystoreSigningOptions): Promise<
  SubmittableExtrinsic
> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeDidCreationOperation(blockchain.api.registry, {
    didIdentifier,
    keys,
    endpointUrl,
  })
  const signature = await signer.sign({
    data: encoded.toU8a(),
    meta: {},
    keyId: signingKeyId,
    alg,
  })
  return blockchain.api.tx.did.submitDidCreateOperation(encoded, {
    [signature.alg]: signature.data,
  })
}

export async function generateUpdateTx({
  didIdentifier,
  txCounter,
  keysToUpdate,
  publicKeysToRemove,
  newEndpointUrl,
  signer,
  signingKeyId,
  alg,
}: IDidUpdateOptions & KeystoreSigningOptions): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeDidUpdateOperation(blockchain.api.registry, {
    didIdentifier,
    txCounter,
    keysToUpdate,
    publicKeysToRemove,
    newEndpointUrl,
  })
  const signature = await signer.sign({
    data: encoded.toU8a(),
    meta: {},
    keyId: signingKeyId,
    alg,
  })
  return blockchain.api.tx.did.submitDidUpdateOperation(encoded, {
    [signature.alg]: signature.data,
  })
}

export async function generateDeleteTx({
  txCounter,
  didIdentifier,
  signer,
  signingKeyId,
  alg,
}: IDidDeletionOptions & KeystoreSigningOptions): Promise<
  SubmittableExtrinsic
> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeDidDeletionOperation(blockchain.api.registry, {
    txCounter,
    didIdentifier,
  })
  const signature = await signer.sign({
    data: encoded.toU8a(),
    meta: {},
    keyId: signingKeyId,
    alg,
  })
  return blockchain.api.tx.did.submitDidDeleteOperation(encoded, {
    [signature.alg]: signature.data,
  })
}

export async function generateDidAuthenticatedTx({
  signingKeyId,
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
    keyId: signingKeyId,
    alg,
  })
  return blockchain.api.tx.did.submitDidCall(signableCall, {
    [signature.alg]: signature.data,
  })
}
