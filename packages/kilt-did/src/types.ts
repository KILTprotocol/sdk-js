/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IIdentity } from '@kiltprotocol/types'
import type { AnyNumber, SignerPayloadJSON } from '@polkadot/types/types'
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

export type KeypairType = string

export interface IPublicKey {
  publicKey: Uint8Array
  type: KeypairType
}

export type IVerificationKey = IPublicKey
export type IEncryptionPublicKey = IPublicKey

export interface ISigningKeyPair extends IVerificationKey {
  sign: (message: string | Uint8Array) => Uint8Array
}

export interface IEncryptionKeyPair extends IEncryptionPublicKey {
  decrypt: (
    message: Uint8Array,
    additionalData: Record<string, unknown>
  ) => Uint8Array | null
}

export type IKeyPair = ISigningKeyPair | IEncryptionKeyPair

export interface PublicKeyRoleAssignment {
  authentication: IVerificationKey
  encryption: IEncryptionPublicKey
  attestation?: IVerificationKey
  delegation?: IVerificationKey
}

export interface TypedPublicKey {
  type: KeypairType
  publicKeyHex: string
}

export interface KeyDetails extends TypedPublicKey {
  id: string
  includedAt: number
}

export interface IDidRecord {
  did: IIdentity['address']
  authenticationKey: KeyDetails['id']
  keyAgreementKeys: Array<KeyDetails['id']>
  delegationKey?: KeyDetails['id']
  attestationKey?: KeyDetails['id']
  publicKeys: KeyDetails[]
  endpointUrl?: string
  lastTxCounter: u64
}

export type Nullable<T> = { [P in keyof T]: T[P] | null }

export type PublicKeyEnum = Partial<Record<KeypairType, Uint8Array>>
export type SignatureEnum = Partial<Record<KeypairType, Uint8Array>>

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

export interface IDidDeletionOptions {
  didIdentifier: IIdentity['address']
  txCounter: AnyNumber
}

export interface IDidUpdateOptions extends IDidDeletionOptions {
  keysToUpdate?: Partial<Nullable<PublicKeyRoleAssignment>>
  publicKeysToRemove?: Array<KeyId | Uint8Array | string>
  newEndpointUrl?: string
}

export interface IAuthorizeCallOptions extends IDidDeletionOptions {
  call: Extrinsic
}

/* CHAIN TYPES / CODECS */

export interface DidVerificationKey extends Enum {
  isEd25519: boolean
  isSr25519: boolean
  asEd25519: Vec<u8>
  asSr25519: Vec<u8>
  type: 'sr25519' | 'ed25519'
  value: Vec<u8>
}

export interface DidEncryptionKey extends Enum {
  isX25519: boolean
  asX25519: Vec<u8>
  type: 'x25519'
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
  did: DidIdentifier
  newAuthenticationKey: Option<DidVerificationKey>
  newKeyAgreementKeys: BTreeSet<DidEncryptionKey>
  attestationKeyUpdate: DidKeyUpdateAction
  delegationKeyUpdate: DidKeyUpdateAction
  publicKeysToRemove: BTreeSet<KeyId>
  newEndpointUrl: Option<Url>
  txCounter: u64
}

export interface DidDeletionOperation extends Struct {
  did: DidIdentifier
  txCounter: u64
}

export interface DidSignature extends Enum {
  isEd25519: boolean
  isSr25519: boolean
  asEd25519: Vec<u8>
  asSr25519: Vec<u8>
}

export interface DidAuthorizedCallOperation extends Struct {
  did: DidIdentifier
  txCounter: u64
  call: Call
}

export interface RequestData<A extends string> {
  alg: A
  keyId: string // id of the key to use
  data: Uint8Array // data to sign / encrypt / decrypt
}

export interface ResponseData<A extends string> {
  alg: A
  data: Uint8Array
}

export interface KeystoreSigningData<A extends string> extends RequestData<A> {
  meta: Partial<SignerPayloadJSON> // info for extensions to display to user
}

export interface Keystore<
  SignAlgs extends string = string,
  EncryptAlgs extends string = string
> {
  supportedAlgs(): Promise<Set<SignAlgs | EncryptAlgs>>
  sign<A extends SignAlgs>(
    signData: KeystoreSigningData<A>
  ): Promise<ResponseData<A>>
  encrypt<A extends EncryptAlgs>(
    requestData: RequestData<A>
  ): Promise<ResponseData<A>>
  decrypt<A extends EncryptAlgs>(
    requestData: RequestData<A>
  ): Promise<ResponseData<A>>
  getKeyIds?(): Promise<string[]>
  // OR if above is deemed to reveal too much:
  hasKeys(keyIds: string[]): Promise<boolean[]>
}

export type KeystoreSigner<A extends string> = Pick<Keystore<A>, 'sign'>
