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
  Hash,
} from '@polkadot/types/interfaces'

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
  call: DidCallable
}

type DidCallable = Call
