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
  IDidDetails,
  KeyDetails,
  KeystoreSigningOptions,
} from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { Crypto } from '@kiltprotocol/utils'
import type { Extrinsic, Hash } from '@polkadot/types/interfaces'
import type {
  DidDetails,
  Url,
  UrlEncoding,
  IAuthorizeCallOptions,
  IDidCreationOptions,
  IDidRecord,
  IDidUpdateOptions,
  DidPublicKeyDetails,
} from './types'
import {
  encodeDidAuthorizedCallOperation,
  encodeDidCreationOperation,
  encodeDidUpdateOperation,
  getKiltDidFromIdentifier,
  getIdentifierFromKiltDid,
} from './Did.utils'

export async function queryEncoded(
  didIdentifier: IIdentity['address']
): Promise<Option<DidDetails>> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.query.did.did<Option<DidDetails>>(didIdentifier)
}

function decodeDidPublicKeyDetails(
  did: string,
  keyId: Hash,
  keyDetails: DidPublicKeyDetails
): KeyDetails {
  const key = keyDetails.key.value
  return {
    id: keyId.toHex(),
    type: key.type,
    controller: did,
    publicKeyHex: key.value.toHex(),
    includedAt: keyDetails.blockNumber.toNumber(),
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
    const did = getKiltDidFromIdentifier(didIdentifier)
    const didDetail = result.unwrap()
    const publicKeys: KeyDetails[] = Array.from(
      didDetail.publicKeys.entries()
    ).map(([keyId, keyDetails]) => {
      return decodeDidPublicKeyDetails(did, keyId, keyDetails)
    })
    const authenticationKeyId = didDetail.authenticationKey.toHex()
    const keyAgreementKeyIds = Array.from(
      didDetail.keyAgreementKeys.values()
    ).map((id) => id.toHex())

    const didRecord: IDidRecord = {
      did,
      publicKeys,
      authenticationKey: authenticationKeyId,
      keyAgreementKeys: keyAgreementKeyIds,
      lastTxCounter: didDetail.lastTxCounter,
    }
    if (didDetail.endpointUrl.isSome) {
      didRecord.endpointData = {
        urls: [decodeEndpointUrl(didDetail.endpointUrl.unwrap())],
        contentType: 'application/json',
        digest: 'N/A',
      }
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
  did: IDidDetails['did']
): Promise<IDidRecord | null> {
  // we will have to extract the id part from the did string
  const didId = getIdentifierFromKiltDid(did)
  return queryById(didId)
}

export async function queryKey(
  did: string,
  keyId: string
): Promise<KeyDetails | null> {
  const encoded = await queryEncoded(getIdentifierFromKiltDid(did))
  if (encoded.isNone) return null
  const keyIdU8a = Crypto.coToUInt8(keyId)
  let key: KeyDetails | null = null
  encoded.unwrap().publicKeys.forEach((keyDetails, id) => {
    if (id.eq(keyIdU8a)) {
      key = decodeDidPublicKeyDetails(did, id, keyDetails)
    }
  })
  return key
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

export async function getUpdateDidExtrinsic({
  keysToUpdate,
  publicKeysToRemove,
  newEndpointUrl,
}: IDidUpdateOptions): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeDidUpdateOperation(api.registry, {
    keysToUpdate,
    publicKeysToRemove,
    newEndpointUrl,
  })
  return api.tx.did.update(encoded)
}

export async function getDeleteDidExtrinsic(): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.did.delete()
}

// async function deleteDid(
//   did: IDidDetails,
//   signer: KeystoreSigner
// ): Promise<SubmittableExtrinsic> {
//   const { api } = await BlockchainApiConnection.getConnectionOrConnect()
//   const extrinsic = api.tx.did.delete()
//   const [key] = getKeysForExtrinsic(api, did, extrinsic)
//   return generateDidAuthenticatedTx({
//     didIdentifier: getIdentifierFromKiltDid(did.did),
//     signingKeyId: key.id,
//     alg: key.type,
//     call: extrinsic,
//     txCounter: did.getNextTxIndex(),
//     signer,
//   })
// }

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
