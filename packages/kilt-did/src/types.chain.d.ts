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

export interface PublicVerificationKey extends Enum {
  isEd25519: boolean
  isSr25519: boolean
  asEd25519: Vec<u8>
  asSr25519: Vec<u8>
}

export interface PublicEncryptionKey extends Enum {
  isX25519: boolean
  asX25519: Vec<u8>
}

export interface VerificationKeyDetails extends Struct {
  /// A verification key the DID controls.
  verification_key: PublicVerificationKey
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

export interface DidDetails extends Struct {
  auth_key: PublicVerificationKey
  key_agreement_key: PublicEncryptionKey
  delegation_key: Option<PublicVerificationKey>
  attestation_key: Option<PublicVerificationKey>
  verification_keys: BTreeMap<KeyId, VerificationKeyDetails>
  endpoint_url: Option<Url>
  last_tx_counter: u64
}

export interface IDidCreationOperation extends Struct {
  did: DidIdentifier
  new_authentication_key: PublicVerificationKey
  new_key_agreement_keys: BTreeSet<PublicEncryptionKey>
  new_attestation_key: Option<PublicVerificationKey>
  new_delegation_key: Option<PublicVerificationKey>
  new_endpoint_url: Option<Url>
}

export interface DidKeyUpdateAction extends Enum {
  /// Do not change the verification key.
  isIgnore: boolean
  asIgnore: null
  /// Change the verification key to the new one provided.
  isChange: boolean
  asChange: PublicVerificationKey
  /// Delete the verification key.
  isDelete: boolean
  asDelete: null
}

export interface IDidUpdateOperation extends Struct {
  did: DidIdentifier
  new_authentication_key: Option<PublicVerificationKey>
  new_key_agreement_keys: BTreeSet<PublicEncryptionKey>
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
