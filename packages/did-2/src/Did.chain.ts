/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  Deposit,
  DidKey,
  DidServiceEndpoint,
  IDidIdentifier,
  IIdentity,
  KeystoreSigningOptions,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import type {
  BlockNumber,
  Call,
  Extrinsic,
  Hash,
} from '@polkadot/types/interfaces'
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
  u32,
  U128,
} from '@polkadot/types'
import type { AnyNumber, Codec } from '@polkadot/types/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { BN, hexToString } from '@polkadot/util'
import { Crypto } from '@kiltprotocol/utils'

// ### Chain type definitions

type KeyId = Hash
type DidKeyAgreementKeys = BTreeSet<KeyId>

type SupportedSignatureKeys = 'sr25519' | 'ed25519' | 'ecdsa'
type SupportedEncryptionKeys = 'x25519'

interface DidVerificationKey<T extends string = SupportedSignatureKeys>
  extends Enum {
  type: T
  value: Vec<u8>
}

interface DidEncryptionKey<T extends string = SupportedEncryptionKeys>
  extends Enum {
  type: T
  value: Vec<u8>
}

interface DidPublicKey extends Enum {
  isPublicVerificationKey: boolean
  asPublicVerificationKey: DidVerificationKey
  isPublicEncryptionKey: boolean
  asPublicEncryptionKey: DidEncryptionKey
  type: 'PublicVerificationKey' | 'PublicEncryptionKey'
  value: DidVerificationKey | DidEncryptionKey
}

interface DidPublicKeyDetails extends Struct {
  key: DidPublicKey
  blockNumber: BlockNumber
}

type DidPublicKeyMap = BTreeMap<KeyId, DidPublicKeyDetails>

interface IDidChainRecordCodec extends Struct {
  authenticationKey: KeyId
  keyAgreementKeys: DidKeyAgreementKeys
  delegationKey: Option<KeyId>
  attestationKey: Option<KeyId>
  publicKeys: DidPublicKeyMap
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
  didIdentifier: IDidIdentifier
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
async function queryServiceEncoded(
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
async function queryAllServicesEncoded(
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
async function queryEndpointsCountsEncoded(
  didIdentifier: IDidIdentifier
): Promise<u32> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.query.did.didEndpointsCount<u32>(didIdentifier)
}

async function queryDepositAmountEncoded(): Promise<U128> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.consts.did.deposit as U128
}

// ### DECODED QUERYING types

export interface IDidChainRecordJSON {
  authenticationKey: DidKey['id']
  keyAgreementKeys: Array<DidKey['id']>
  capabilityDelegationKey?: DidKey['id']
  assertionMethodKey?: DidKey['id']
  publicKeys: DidKey[]
  lastTxCounter: u64
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

export async function queryDetails(
  didIdentifier: IDidIdentifier
): Promise<IDidChainRecordJSON | null> {
  const result = await queryDidEncoded(didIdentifier)
  if (result.isNone) {
    return null
  }
  return decodeDidChainRecord(result.unwrap())
}

export async function queryKey(
  didIdentifier: IDidIdentifier,
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

export async function queryServiceEndpoints(
  didIdentifier: IDidIdentifier
): Promise<DidServiceEndpoint[]> {
  const encoded = await queryAllServicesEncoded(didIdentifier)
  return encoded.map((e) => decodeServiceChainRecord(e))
}

export async function queryServiceEndpoint(
  didIdentifier: IDidIdentifier,
  serviceId: DidServiceEndpoint['id']
): Promise<DidServiceEndpoint | null> {
  const serviceEncoded = await queryServiceEncoded(didIdentifier, serviceId)
  if (serviceEncoded.isNone) return null

  return decodeServiceChainRecord(serviceEncoded.unwrap())
}

export async function queryEndpointsCounts(
  didIdentifier: IDidIdentifier
): Promise<BN> {
  const endpointsCountEncoded = await queryEndpointsCountsEncoded(didIdentifier)
  return endpointsCountEncoded.toBn()
}

export async function queryNonce(didIdentifier: IDidIdentifier): Promise<BN> {
  const encoded = await queryDidEncoded(didIdentifier)
  return encoded.isSome ? encoded.unwrap().lastTxCounter.toBn() : new BN(0)
}

export async function queryDidDeletionStatus(
  didIdentifier: IDidIdentifier
): Promise<boolean> {
  const encodedDeletionStorageEntry = await queryDidDeletionStatusEncoded(
    didIdentifier
  )
  // The result is a 1-byte array where the only element is 1 if the DID has been deleted, and 0 otherwise.
  return encodedDeletionStorageEntry[0] === 1
}

export async function queryDepositAmount(): Promise<BN> {
  const encodedDeposit = await queryDepositAmountEncoded()
  return encodedDeposit.toBn()
}

export async function queryDeletedDidIdentifiers(): Promise<IDidIdentifier[]> {
  const encodedIdentifiers = await queryDeletedDidsEncoded()
  return encodedIdentifiers.map((id) => id.toHuman())
}

// ### EXTRINSICS types

export type AuthorizeCallInput = {
  didIdentifier: IDidIdentifier
  txCounter: AnyNumber
  call: Extrinsic
  submitter: IIdentity['address']
  blockNumber?: AnyNumber
}

interface IDidAuthorizedCallOperation extends Struct {
  did: IDidIdentifier
  txCounter: u64
  call: Call
  submitter: GenericAccountId
  blockNumber: AnyNumber
}

// ### EXTRINSICS

// The block number can either be provided by the DID subject,
// or the latest one will automatically be fetched from the blockchain.
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
  const signableCall =
    new (api.registry.getOrThrow<IDidAuthorizedCallOperation>(
      'DidAuthorizedCallOperation'
    ))(api.registry, {
      txCounter,
      didIdentifier,
      call,
      submitter,
      blockNumber: blockNumber || (await api.query.system.number()),
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
