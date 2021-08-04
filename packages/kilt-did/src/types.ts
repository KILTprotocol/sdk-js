/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IIdentity, KeyDetails } from '@kiltprotocol/types'
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

export interface INewPublicKey<T extends string = string> {
  publicKey: Uint8Array
  type: T
}

export interface PublicKeyRoleAssignment {
  authentication: INewPublicKey
  encryption?: INewPublicKey
  attestation?: INewPublicKey
  delegation?: INewPublicKey
}

export interface IEndpointData {
  digest: string
  contentType: string
  urls: string[]
}

export interface IDidRecord {
  did: IIdentity['address']
  authenticationKey: KeyDetails['id']
  keyAgreementKeys: Array<KeyDetails['id']>
  delegationKey?: KeyDetails['id']
  attestationKey?: KeyDetails['id']
  publicKeys: KeyDetails[]
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

export interface IDidCreationOptions {
  didIdentifier: IIdentity['address']
  keys: PublicKeyRoleAssignment
  endpointUrl?: string
}

export interface IDidUpdateOptions {
  keysToUpdate?: Partial<Nullable<PublicKeyRoleAssignment>>
  publicKeysToRemove?: Array<KeyId | Uint8Array | string>
  newEndpointUrl?: string
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

export interface DidDetails extends Struct {
  authenticationKey: KeyId
  keyAgreementKeys: BTreeSet<KeyId>
  delegationKey: Option<KeyId>
  attestationKey: Option<KeyId>
  publicKeys: BTreeMap<KeyId, DidPublicKeyDetails>
  endpointUrl: Option<Url>
  lastTxCounter: u64
}

export interface DidCreationOperation extends Struct {
  did: DidIdentifier
  newAuthenticationKey: DidVerificationKey
  newKeyAgreementKeys: BTreeSet<DidEncryptionKey>
  newAttestationKey: Option<DidVerificationKey>
  newDelegationKey: Option<DidVerificationKey>
  newEndpointUrl: Option<Url>
}

export interface DidKeyUpdateAction extends Enum {
  /// Do not change the verification key.
  isIgnore: boolean
  asIgnore: null
  /// Change the verification key to the new one provided.
  isChange: boolean
  asChange: DidVerificationKey
  /// Delete the verification key.
  isDelete: boolean
  asDelete: null
}

export interface DidUpdateOperation extends Struct {
  newAuthenticationKey: Option<DidVerificationKey>
  newKeyAgreementKeys: BTreeSet<DidEncryptionKey>
  attestationKeyUpdate: DidKeyUpdateAction
  delegationKeyUpdate: DidKeyUpdateAction
  publicKeysToRemove: BTreeSet<KeyId>
  newEndpointUrl: Option<Url>
}

export interface DidAuthorizedCallOperation extends Struct {
  did: DidIdentifier
  txCounter: u64
  call: Call
}
