import type { IIdentity } from '@kiltprotocol/types'

export type KeypairType = 'ed25519' | 'sr15519' | 'x25519'

export interface IKeyPair {
  publicKey: Uint8Array
  type: KeypairType
  // do we need the identifier?
}

export interface ISigningKeyPair extends IKeyPair {
  sign: (message: string | Uint8Array) => Uint8Array
}

export interface IEncryptionKeyPair extends IKeyPair {
  decrypt: (
    message: Uint8Array,
    nonce: Uint8Array,
    senderPublicKey: Uint8Array
  ) => Uint8Array | null
}

// TODO: should this use the same keys as the chain type?
export interface KeySet {
  authentication: ISigningKeyPair
  encryption: IEncryptionKeyPair
  attestation?: ISigningKeyPair
  delegation?: ISigningKeyPair
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
  auth_key: TypedPublicKey
  key_agreement_key: TypedPublicKey
  delegation_key?: TypedPublicKey
  attestation_key?: TypedPublicKey
  verification_keys: KeyDetails[]
  endpoint_url?: string
  last_tx_counter: number
}

export type Nullable<T> = { [P in keyof T]: T[P] | null }

export type PublicKeyEnum = Partial<Record<KeypairType, Uint8Array>>
export type SignatureEnum = Partial<Record<KeypairType, Uint8Array>>

interface UrlEncoding {
  payload: string
}
export type UrlEnum = {}

export interface DidSigned<PayloadType> {
  payload: PayloadType
  signature: SignatureEnum
}
