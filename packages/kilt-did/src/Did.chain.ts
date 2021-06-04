/**
 * @packageDocumentation
 * @module DID
 */

import type { Option } from '@polkadot/types'
import type { IIdentity, SubmittableExtrinsic } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type { IDid } from '@kiltprotocol/core'
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
  ISigningKeyPair,
  IUpdateOptions,
  KeyDetails,
  KeypairType,
  TypedPublicKey,
} from './types'
import {
  encodeDidAuthorizedCallOperation,
  encodeDidCreationOperation,
  encodeDidDeletionOperation,
  encodeDidUpdateOperation,
  getDidFromIdentifier,
  getIdentifierFromDid,
  signCodec,
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
      authenticationKey: publicKeys.find(
        (key) => key.id === authenticationKeyId
      )!,
      keyAgreementKeys: publicKeys.filter((key) =>
        keyAgreementKeyIds.includes(key.id)
      ),
      lastTxCounter: didDetail.lastTxCounter,
    }
    if (didDetail.endpointUrl.isSome) {
      // that's super awkward but I guess there are reasons that the Url encoding needs to be a struct
      didRecord.endpointUrl = decodeEndpointUrl(didDetail.endpointUrl.unwrap())
    }
    if (didDetail.delegationKey.isSome) {
      const delegationKeyId = didDetail.delegationKey.unwrap().toHex()
      didRecord.delegationKey = publicKeys.find(
        (key) => key.id === delegationKeyId
      )
    }
    if (didDetail.attestationKey.isSome) {
      const attestationKeyId = didDetail.attestationKey.unwrap().toHex()
      didRecord.attestationKey = publicKeys.find(
        (key) => key.id === attestationKeyId
      )
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

export async function generateCreateTx(
  createOptions: IDidCreationOptions,
  authenticationKeypair: ISigningKeyPair
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeDidCreationOperation(
    blockchain.api.registry,
    createOptions
  )
  const { payload, signature } = signCodec(encoded, authenticationKeypair)
  return blockchain.api.tx.did.submitDidCreateOperation(payload, signature)
}

export async function generateUpdateTx(
  updateOptions: IUpdateOptions,
  authenticationKeypair: ISigningKeyPair
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeDidUpdateOperation(
    blockchain.api.registry,
    updateOptions
  )
  const { payload, signature } = signCodec(encoded, authenticationKeypair)

  return blockchain.api.tx.did.submitDidUpdateOperation(payload, signature)
}

export async function generateDeleteTx(
  deleteOptions: IDidDeletionOptions,
  authenticationKeypair: ISigningKeyPair
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = encodeDidDeletionOperation(
    blockchain.api.registry,
    deleteOptions
  )
  const { payload, signature } = signCodec(encoded, authenticationKeypair)
  return blockchain.api.tx.did.submitDidDeleteOperation(payload, signature)
}

export async function generateDidAuthenticatedTx(
  callAuthorizationOptions: IAuthorizeCallOptions,
  signingKeypair: ISigningKeyPair
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const signableCall = encodeDidAuthorizedCallOperation(
    blockchain.api.registry,
    callAuthorizationOptions
  )
  const { payload, signature } = signCodec(signableCall, signingKeypair)
  return blockchain.api.tx.did.submitDidCall(payload, signature)
}
