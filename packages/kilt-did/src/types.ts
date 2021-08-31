/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IIdentity,
  IDidKeyDetails,
  IDidDetails,
  KeyRelationship,
} from '@kiltprotocol/types'
import type { AnyNumber } from '@polkadot/types/types'
import type {
  BTreeMap,
  BTreeSet,
  Enum,
  Option,
  Struct,
  u64,
  u8,
  Vec,
} from '@polkadot/types'
import type {
  AccountId,
  BlockNumber,
  Call,
  Extrinsic,
  Hash,
} from '@polkadot/types/interfaces'

/* SDK TYPES */

export type IDidParsingResult = {
  did: IDidDetails['did']
  version: number
  type: 'light' | 'full'
  identifier: IIdentity['address']
  fragment?: string
  encodedDetails?: string
}

export type MapKeyToRelationship = Partial<
  Record<KeyRelationship, Array<IDidKeyDetails['id']>>
>

export interface INewPublicKey<T extends string = string> {
  publicKey: Uint8Array
  type: T
}

export type PublicKeyRoleAssignment = Partial<
  Record<KeyRelationship, INewPublicKey>
>

export interface IEndpointData {
  contentHash: string
  contentType: string
  urls: string[]
}

export interface IDidChainRecordJSON {
  did: IIdentity['address']
  authenticationKey: IDidKeyDetails['id']
  keyAgreementKeys: Array<IDidKeyDetails['id']>
  capabilityDelegationKey?: IDidKeyDetails['id']
  assertionMethodKey?: IDidKeyDetails['id']
  publicKeys: IDidKeyDetails[]
  endpointData?: IEndpointData
  lastTxCounter: u64
}

export type Nullable<T> = { [P in keyof T]: T[P] | null }

export type PublicKeyEnum = Record<string, Uint8Array>
export type SignatureEnum = Record<string, Uint8Array>

export interface UrlEncodingJson {
  payload: string
}

export type UrlEnum =
  | { Http: UrlEncodingJson }
  | { Ftp: UrlEncodingJson }
  | { Ipfs: UrlEncodingJson }

export interface DidSigned<PayloadType> {
  payload: PayloadType
  signature: SignatureEnum
}

export interface EndpointData {
  contentHash: string
  contentType: ContentType['type']
  urls: string[]
}

export interface IDidCreationOptions {
  didIdentifier: IIdentity['address']
  keys?: PublicKeyRoleAssignment
  endpointData?: EndpointData
}

export interface IAuthorizeCallOptions {
  didIdentifier: IIdentity['address']
  txCounter: AnyNumber
  call: Extrinsic
}

/* CHAIN TYPES / CODECS */

type SupportedSignatureKeys = 'sr25519' | 'ed25519' | 'ecdsa'
type SupportedEncryptionKeys = 'x25519'

export interface DidVerificationKey<T extends string = SupportedSignatureKeys>
  extends Enum {
  type: T
  value: Vec<u8>
}

export interface DidEncryptionKey<T extends string = SupportedEncryptionKeys>
  extends Enum {
  type: T
  value: Vec<u8>
}

export interface VerificationKeyDetails extends Struct {
  /// A verification key the DID controls.
  verificationKey: DidVerificationKey
  /// The block number in which the verification key was added to the DID.
  blockNumber: BlockNumber
}

export type KeyId = Hash

export type DidIdentifier = AccountId

export interface UrlEncoding extends Struct {
  payload: Vec<u8>
}

export interface Url extends Enum {
  isHttp: boolean
  isFtp: boolean
  isIpfs: boolean
  asHttp: UrlEncoding
  asFtp: UrlEncoding
  asIpfs: UrlEncoding
}

export interface DidPublicKey extends Enum {
  isPublicVerificationKey: boolean
  asPublicVerificationKey: DidVerificationKey
  isPublicEncryptionKey: boolean
  asPublicEncryptionKey: DidEncryptionKey
  type: 'PublicVerificationKey' | 'PublicEncryptionKey'
  value: DidVerificationKey | DidEncryptionKey
}

export interface DidPublicKeyDetails extends Struct {
  key: DidPublicKey
  blockNumber: BlockNumber
}

export interface ContentType extends Enum {
  'isApplication/json': boolean
  'isApplication/ld+json': boolean
  type: 'application/json' | 'application/ld+json'
}

export interface ServiceEndpoints extends Struct {
  contentHash: Hash
  urls: Vec<Url>
  contentType: ContentType
}

export type DidKeyAgreementKeys = BTreeSet<KeyId>
export type DidPublicKeyMap = BTreeMap<KeyId, DidPublicKeyDetails>

export interface IDidChainRecordCodec extends Struct {
  authenticationKey: KeyId
  keyAgreementKeys: DidKeyAgreementKeys
  capabilityDelegationKey: Option<KeyId>
  assertionMethodKey: Option<KeyId>
  publicKeys: DidPublicKeyMap
  serviceEndpoints: Option<ServiceEndpoints>
  lastTxCounter: u64
}

export interface DidCreationDetails extends Struct {
  did: DidIdentifier
  newKeyAgreementKeys: BTreeSet<DidEncryptionKey>
  newAssertionMethodKey: Option<DidVerificationKey>
  newDelegationKey: Option<DidVerificationKey>
  newServiceEndpoints: Option<ServiceEndpoints>
}

export interface DidAuthorizedCallOperation extends Struct {
  did: DidIdentifier
  txCounter: u64
  call: Call
}
