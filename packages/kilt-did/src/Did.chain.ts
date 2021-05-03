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
  IDidCreationOperation,
  IDidDeletionOperation,
  IDidUpdateOperation,
  DidEncryptionKey,
  DidVerificationKey,
  Url,
  UrlEncoding,
} from './types.chain'
import type {
  DidSigned,
  IDidRecord,
  KeyDetails,
  KeypairType,
  TypedPublicKey,
} from './types'
import { getDidFromIdentifier, getIdentifierFromDid } from './Did.utils'

export async function queryEncoded(
  did_identifier: IIdentity['address']
): Promise<Option<DidDetails>> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.query.did.did<Option<DidDetails>>(did_identifier)
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
  did_identifier: IIdentity['address']
): Promise<IDidRecord | null> {
  const result = await queryEncoded(did_identifier)
  result.unwrapOr(null)
  if (result.isSome) {
    const didDetail = result.unwrap()
    const public_keys: KeyDetails[] = Array.from(
      didDetail.public_keys.entries()
    ).map(([keyId, keyDetails]) => {
      return {
        ...decodePublicKey(keyDetails.key.value),
        id: keyId.toHex(),
        includedAt: keyDetails.block_number.toNumber(),
      }
    })
    const authenticationKeyId = didDetail.authentication_key.toHex()
    const keyAgreementKeyIds = Array.from(
      didDetail.key_agreement_keys.values()
    ).map((id) => id.toHex())

    const didRecord: IDidRecord = {
      did: getDidFromIdentifier(did_identifier),
      public_keys,
      authentication_key: public_keys.find(
        (key) => key.id === authenticationKeyId
      )!,
      key_agreement_keys: public_keys.filter((key) =>
        keyAgreementKeyIds.includes(key.id)
      ),
      last_tx_counter: didDetail.last_tx_counter.toNumber(),
    }
    if (didDetail.endpoint_url.isSome) {
      // that's super awkward but I guess there are reasons that the Url encoding needs to be a struct
      didRecord.endpoint_url = decodeEndpointUrl(
        didDetail.endpoint_url.unwrap()
      )
    }
    if (didDetail.delegation_key.isSome) {
      const delegationKeyId = didDetail.delegation_key.unwrap().toHex()
      didRecord.delegation_key = public_keys.find(
        (key) => key.id === delegationKeyId
      )
    }
    if (didDetail.attestation_key.isSome) {
      const attestationKeyId = didDetail.attestation_key.unwrap().toHex()
      didRecord.attestation_key = public_keys.find(
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

export async function didCreateTx(
  createDid: DidSigned<IDidCreationOperation>
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.did.submitDidCreateOperation(
    createDid.payload,
    createDid.signature
  )
}

export async function didUpdateTx(
  keyUpdate: DidSigned<IDidUpdateOperation>
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.did.submitDidUpdateOperation(
    keyUpdate.payload,
    keyUpdate.signature
  )
}

export async function didDeleteTx(
  keyRemoval: DidSigned<IDidDeletionOperation>
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.did.submitDidDeleteOperation(
    keyRemoval.payload,
    keyRemoval.signature
  )
}
