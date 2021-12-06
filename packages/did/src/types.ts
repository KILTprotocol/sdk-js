/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  Deposit,
  DidKey,
  IDidDetails,
  DidServiceEndpoint,
  KeyRelationship,
  IDidIdentifier,
} from '@kiltprotocol/types'
import { BN } from '@polkadot/util'
import type { AnyNumber } from '@polkadot/types/types'
import type {
  BTreeMap,
  BTreeSet,
  Enum,
  Option,
  Struct,
  Text,
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
  identifier: string
  fragment?: string
  encodedDetails?: string
}

export type MapKeyToRelationship = Partial<
  Record<KeyRelationship, Array<DidKey['id']>>
>

export interface INewPublicKey<T extends string = string> {
  publicKey: Uint8Array
  type: T
}

export type PublicKeyRoleAssignment = Partial<
  Record<KeyRelationship, Set<DidKey>>
>

export interface IDidChainRecordJSON {
  authenticationKey: DidKey['id']
  keyAgreementKeys: Array<DidKey['id']>
  capabilityDelegationKey?: DidKey['id']
  assertionMethodKey?: DidKey['id']
  publicKeys: DidKey[]
  lastTxCounter: u64
}

export type Nullable<T> = { [P in keyof T]: T[P] | null }

export type PublicKeyEnum = Record<string, Uint8Array>
export type SignatureEnum = Record<string, Uint8Array>

export interface DidSigned<PayloadType> {
  payload: PayloadType
  signature: SignatureEnum
}

export interface IAuthorizeCallOptions {
  didIdentifier: IDidIdentifier
  txCounter: AnyNumber
  call: Extrinsic
  submitter: IDidIdentifier
  blockNumber: AnyNumber
}

// Like IAuthorizeCallOptions above, but allows for an optional blockNumber.
export type AuthenticationTxCreationInput = Omit<
  IAuthorizeCallOptions,
  'blockNumber'
> & { blockNumber?: AnyNumber }

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

export type DidKeyAgreementKeys = BTreeSet<KeyId>
export type DidPublicKeyMap = BTreeMap<KeyId, DidPublicKeyDetails>

export interface IDidChainRecordCodec extends Struct {
  authenticationKey: KeyId
  keyAgreementKeys: DidKeyAgreementKeys
  delegationKey: Option<KeyId>
  attestationKey: Option<KeyId>
  publicKeys: DidPublicKeyMap
  lastTxCounter: u64
  deposit: Deposit
}

export interface IServiceEndpointChainRecordCodec extends Struct {
  id: Text
  serviceTypes: Vec<Text>
  urls: Vec<Text>
}

export interface IDidCreationDetails extends Struct {
  did: IDidIdentifier
  newKeyAgreementKeys: BTreeSet<DidEncryptionKey>
  newAttestationKey: Option<DidVerificationKey>
  newDelegationKey: Option<DidVerificationKey>
  newServiceDetails: Vec<IServiceEndpointChainRecordCodec>
}

export interface IDidAuthorizedCallOperation extends Struct {
  did: IDidIdentifier
  txCounter: u64
  call: Call
  submitter: AccountId
  blockNumber: AnyNumber
}

export type JsonDidDocument = {
  id: IDidDetails['did']
  verificationMethod: Pick<DidKey, 'id' | 'controller' | 'type'> & {
    publicKeyBase58: string
  }
  authentication: string[]
  assertionMethod?: string[]
  keyAgreement?: string[]
  capabilityDelegation?: string[]
  serviceEndpoints?: DidServiceEndpoint[]
}

export type JsonLDDidDocument = JsonDidDocument & { '@context': string[] }

export type DidCreationDetails = {
  did: IDidDetails['did']
  // Accepts a list of keys where the ID does not include the DID URI.
  keys: Map<DidKey['id'], Omit<DidKey, 'id'>>
  keyRelationships: MapKeyToRelationship
  // Accepts a list of service endpoints where the ID does not include the DID URI.
  serviceEndpoints: Array<Omit<DidServiceEndpoint, 'id'> & { id: string }>
}

/**
 * The options that can be used to create a light DID.
 */
export type LightDidCreationDetails = {
  /**
   * The DID authentication key. This is mandatory and will be used as the first authentication key
   * of the full DID upon migration.
   */
  authenticationKey: Pick<DidKey, 'type'> & { publicKey: Uint8Array }
  /**
   * The optional DID encryption key. If present, it will be used as the first key agreement key
   * of the full DID upon migration.
   */
  encryptionKey?: Pick<DidKey, 'type'> & { publicKey: Uint8Array }
  /**
   * The set of service endpoints associated with this DID. Each service endpoint ID must be unique.
   * The service ID must not contain the DID prefix when used to create a new DID.
   *
   * @example ```typescript
   * const authenticationKey = exampleKey;
   * const services = [
   *   {
   *     id: 'test-service',
   *     types: ['CredentialExposureService'],
   *     urls: ['http://my_domain.example.org'],
   *   },
   * ];
   * const lightDid = new LightDid({ authenticationKey, services });
   * RequestForAttestation.fromRequest(parsedRequest);
   * ```
   */
  serviceEndpoints?: DidServiceEndpoint[]
}

export type FullDidDetailsCreationOpts = {
  // The full DID URI, following the scheme did:kilt:<kilt_address>
  did: string
  keys: IDidKeyDetails[]
  keyRelationships: MapKeyToRelationship
  lastTxIndex: BN
  serviceEndpoints?: DidServiceEndpoint[]
}
