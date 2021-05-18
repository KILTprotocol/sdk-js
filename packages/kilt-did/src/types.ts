import type { IIdentity, SubmittableExtrinsic } from '@kiltprotocol/types'
import { AnyNumber } from '@polkadot/types/types'
import { KeyId } from './types.chain'

export type KeypairType = string

export interface IPublicKey {
  publicKey: Uint8Array
  type: KeypairType
  // do we need the identifier?
}

export type IKeyPair = IPublicKey

export type ISigningKey = IPublicKey
export type IEncryptionKey = IPublicKey

export interface ISigningKeyPair extends ISigningKey {
  sign: (message: string | Uint8Array) => Uint8Array
}

export interface IEncryptionKeyPair extends IEncryptionKey {
  decrypt: (
    message: Uint8Array,
    additionalData: Record<string, unknown>
  ) => Uint8Array | null
}

// TODO: should this use the same keys as the chain type?
export interface KeySet {
  authentication: ISigningKeyPair
  encryption: IEncryptionKeyPair
  attestation?: ISigningKeyPair
  delegation?: ISigningKeyPair
}

export interface PublicKeySet {
  authentication: ISigningKey
  encryption: IEncryptionKey
  attestation?: ISigningKey
  delegation?: ISigningKey
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
  lastTxCounter: number
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

export interface ICreateOptions {
  didIdentifier: IIdentity['address']
  keys: PublicKeySet
  endpointUrl?: string
}

export interface IDeleteOptions {
  didIdentifier: IIdentity['address']
  txCounter: AnyNumber
}

export interface IUpdateOptions extends IDeleteOptions {
  keysToUpdate?: Partial<Nullable<PublicKeySet>>
  publicKeysToRemove?: KeyId[]
  newEndpointUrl?: string
}

export interface IAuthorizeCallOptions extends IDeleteOptions {
  call: SubmittableExtrinsic
}
