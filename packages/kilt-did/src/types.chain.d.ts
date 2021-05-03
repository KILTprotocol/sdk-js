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
import type { AccountId, BlockNumber, Hash } from '@polkadot/types/interfaces'

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
  verification_key: DidVerificationKey
  /// The block number in which the verification key was added to the DID.
  block_number: BlockNumber
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
  isDidVerificationKey: boolean
  asDidVerificationKey: DidVerificationKey
  isDidEncryptionKey: boolean
  asDidEncryptionKey: DidEncryptionKey
  type: 'DidVerificationKey' | 'DidEncryptionKey'
  value: DidVerificationKey | DidEncryptionKey
}

export interface DidPublicKeyDetails extends Struct {
  key: DidPublicKey
  block_number: BlockNumber
}

export interface DidDetails extends Struct {
  authentication_key: KeyId
  key_agreement_keys: BTreeSet<KeyId>
  delegation_key: Option<KeyId>
  attestation_key: Option<KeyId>
  public_keys: BTreeMap<KeyId, DidPublicKeyDetails>
  endpoint_url: Option<Url>
  last_tx_counter: u64
}

export interface IDidCreationOperation extends Struct {
  did: DidIdentifier
  new_authentication_key: DidVerificationKey
  new_key_agreement_keys: BTreeSet<DidEncryptionKey>
  new_attestation_key: Option<DidVerificationKey>
  new_delegation_key: Option<DidVerificationKey>
  new_endpoint_url: Option<Url>
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

export interface IDidUpdateOperation extends Struct {
  did: DidIdentifier
  new_authentication_key: Option<DidVerificationKey>
  new_key_agreement_keys: BTreeSet<DidEncryptionKey>
  attestation_key_update: DidKeyUpdateAction
  delegation_key_update: DidKeyUpdateAction
  public_keys_to_remove: BTreeSet<KeyId>
  new_endpoint_url: Option<Url>
  tx_counter: u64
}

export interface IDidDeletionOperation extends Struct {
  did: DidIdentifier
  tx_counter: u64
}

export interface DidSignature extends Enum {
  isEd25519: boolean
  isSr25519: boolean
  asEd25519: Vec<u8>
  asSr25519: Vec<u8>
}
