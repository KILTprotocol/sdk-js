import type { IIdentity, SubmittableExtrinsic } from '@kiltprotocol/types'
import { u64 } from '@polkadot/types'
import { AnyNumber } from '@polkadot/types/types'
import { KeyId } from './types.chain'

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

export interface PublicKeySet {
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
  authenticationKey: KeyDetails
  keyAgreementKeys: KeyDetails[]
  delegationKey?: KeyDetails
  attestationKey?: KeyDetails
  publicKeys: KeyDetails[]
  endpointUrl?: string
  lastTxCounter: u64
}

export type Nullable<T> = { [P in keyof T]: T[P] | null }

export type PublicKeyEnum = Partial<Record<KeypairType, Uint8Array>>
export type SignatureEnum = Partial<Record<KeypairType, Uint8Array>>

export interface UrlEncoding {
  payload: string
}

export type UrlEnum =
  | { Http: UrlEncoding }
  | { Ftp: UrlEncoding }
  | { Ipfs: UrlEncoding }

export interface DidSigned<PayloadType> {
  payload: PayloadType
  signature: SignatureEnum
}

export interface IDidCreationOptions {
  didIdentifier: IIdentity['address']
  keys: PublicKeySet
  endpointUrl?: string
}

export interface IDidDeletionOptions {
  didIdentifier: IIdentity['address']
  txCounter: AnyNumber
}

export interface IUpdateOptions extends IDidDeletionOptions {
  keysToUpdate?: Partial<Nullable<PublicKeySet>>
  publicKeysToRemove?: Array<KeyId | Uint8Array | string>
  newEndpointUrl?: string
}

export interface IAuthorizeCallOptions extends IDidDeletionOptions {
  call: SubmittableExtrinsic
}
