/**
 * Blockchain Api Connection enables the building and accessing of the KILT [[Blockchain]] connection. In which it keeps one connection open and allows to reuse the connection for all [[Blockchain]] related tasks.
 *
 * Other modules can access the [[Blockchain]] as such: `const blockchain = await getConnectionOrConnect()`.
 *
 * @packageDocumentation
 * @module BlockchainApiConnection
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import { RegistryTypes } from '@polkadot/types/types'
import { ConfigService } from '@kiltprotocol/config'
import Blockchain from '../blockchain/Blockchain'

let instance: Promise<Blockchain> | null

export const CUSTOM_TYPES: RegistryTypes = {
  Balance: 'u128',
  PublicSigningKey: 'Hash',
  PublicBoxKey: 'Hash',
  BlockNumber: 'u64',
  AmountOf: 'i128',
  Index: 'u64',
  Permissions: 'u32',
  DelegationNodeId: 'Hash',
  DelegationNode: {
    rootId: 'DelegationNodeId',
    parent: 'Option<DelegationNodeId>',
    owner: 'DelegatorId',
    permissions: 'Permissions',
    revoked: 'bool',
  },
  DelegationRoot: { ctypeHash: 'Hash', owner: 'DelegatorId', revoked: 'bool' },
  Attestation: {
    ctypeHash: 'Hash',
    attester: 'AccountId',
    delegationId: 'Option<DelegationNodeId>',
    revoked: 'bool',
  },
  XCurrencyId: { chainId: 'ChainId', currencyId: 'Vec<u8>' },
  ChainId: { _enum: { RelayChain: 'Null', ParaChain: 'ParaId' } },
  CurrencyIdOf: 'CurrencyId',
  CurrencyId: { _enum: { Dot: 0, Ksm: 1, Kilt: 2 } },
  DidIdentifier: 'AccountId',
  DidVerificationKeyType: {
    _enum: [
      'Authentication',
      'CapabilityDelegation',
      'CapabilityInvocation',
      'AssertionMethod',
    ],
  },
  DidEncryptionKeyType: { _enum: ['KeyAgreement'] },
  DidVerificationKey: {
    _enum: { Ed25519: '[u8; 32]', Sr25519: '[u8; 32]' },
  },
  DidSignature: {
    _enum: { Ed25519: 'Ed25519Signature', Sr25519: 'Sr25519Signature' },
  },
  DidEncryptionKey: { _enum: { X25519: '[u8; 32]' } },
  DidError: {
    _enum: {
      StorageError: 'StorageError',
      SignatureError: 'SignatureError',
      UrlError: 'UrlError',
      InternalError: 'null',
    },
  },
  StorageError: {
    _enum: {
      DidAlreadyPresent: 'Null',
      DidNotPresent: 'Null',
      DidKeyNotPresent: 'DidVerificationKeyRelationship',
      VerificationKeyNotPresent: 'Null',
      CurrentlyActiveKey: 'Null',
      MaxTxCounterValue: 'Null',
    },
  },
  SignatureError: {
    _enum: ['InvalidSignatureFormat', 'InvalidSignature', 'InvalidNonce'],
  },
  OperationError: { _enum: ['InvalidNonce'] },
  UrlError: { _enum: ['InvalidUrlEncoding', 'InvalidUrlScheme'] },
  Url: { _enum: { Http: 'HttpUrl', Ftp: 'FtpUrl', Ipfs: 'IpfsUrl' } },
  HttpUrl: { payload: 'Text' },
  FtpUrl: { payload: 'Text' },
  IpfsUrl: { payload: 'Text' },
  DidCreationOperation: {
    did: 'DidIdentifier',
    newAuthenticationKey: 'DidVerificationKey',
    newKeyAgreementKeys: 'BTreeSet<DidEncryptionKey>',
    newAttestationKey: 'Option<DidVerificationKey>',
    newDelegationKey: 'Option<DidVerificationKey>',
    newEndpointUrl: 'Option<Url>',
  },
  DidUpdateOperation: {
    did: 'DidIdentifier',
    newAuthenticationKey: 'Option<DidVerificationKey>',
    newKeyAgreementKeys: 'BTreeSet<DidEncryptionKey>',
    attestationKeyUpdate: 'DidVerificationKeyUpdateAction',
    delegationKeyUpdate: 'DidVerificationKeyUpdateAction',
    publicKeysToRemove: 'BTreeSet<KeyId>',
    newEndpointUrl: 'Option<Url>',
    txCounter: 'u64',
  },
  DidDeletionOperation: { did: 'DidIdentifier', txCounter: 'u64' },
  DidDetails: {
    authenticationKey: 'KeyId',
    keyAgreementKeys: 'BTreeSet<KeyId>',
    delegationKey: 'Option<KeyId>',
    attestationKey: 'Option<KeyId>',
    publicKeys: 'BTreeMap<KeyId, DidPublicKeyDetails>',
    endpointUrl: 'Option<Url>',
    lastTxCounter: 'u64',
  },
  DidPublicKeyDetails: {
    key: 'DidPublicKey',
    blockNumber: 'BlockNumber',
  },
  DidPublicKey: {
    _enum: {
      PublicVerificationKey: 'DidVerificationKey',
      PublicEncryptionKey: 'DidEncryptionKey',
    },
  },
  DidVerificationKeyUpdateAction: {
    _enum: {
      Ignore: 'Null',
      Change: 'DidVerificationKey',
      Delete: 'Null',
    },
  },
  KeyId: 'Hash',

  Address: 'MultiAddress',
  LookupSource: 'MultiAddress',

  CtypeCreator: 'DidIdentifier',
  CtypeHash: 'Hash',

  ClaimHash: 'Hash',
  Attester: 'DidIdentifier',

  DelegatorId: 'DidIdentifier',
  DelegationSignature: 'DidSignature',

  AccountIdentifier: 'AccountId',
  DidCallable: 'Call',
  DidVerificationKeyRelationship: {
    _enum: [
      'Authentication',
      'CapabilityDelegation',
      'CapabilityInvocation',
      'AssertionMethod',
    ],
  },

  KeyError: {
    _enum: ['InvalidVerificationKeyFormat', 'InvalidEncryptionKeyFormat'],
  },
  DidAuthorizedCallOperation: {
    did: 'DidIdentifier',
    txCounter: 'u64',
    call: 'DidCallable',
  },
}

/**
 * Builds a new blockchain connection instance.
 *
 * @param host Optional host address. Otherwise taken from the ConfigService.
 * @returns A new blockchain connection instance.
 */
export async function buildConnection(
  host: string = ConfigService.get('address')
): Promise<Blockchain> {
  const provider = new WsProvider(host)
  const api: ApiPromise = await ApiPromise.create({
    provider,
    types: CUSTOM_TYPES,
  })
  return new Blockchain(api)
}

/**
 * Allows caching of a self-built connection instance.
 * This will be automatically used by all chain functions.
 *
 * For advanced use-cases only.
 *
 * @param connectionInstance The Blockchain instance, which should be cached.
 */
export function setConnection(connectionInstance: Promise<Blockchain>): void {
  instance = connectionInstance
}

/**
 * Gets the cached blockchain connection instance.
 *
 * @returns Cached blockchain connection.
 */
export function getConnection(): Promise<Blockchain> | null {
  return instance
}

/**
 * Gets the cached blockchain connection, or builds a new one, if non-existant.
 *
 * @returns The cached or newly built blockchain connection instance.
 */
export async function getConnectionOrConnect(): Promise<Blockchain> {
  if (!instance) {
    instance = buildConnection()
  }
  return instance
}

/**
 * Clears the cached blockchain connection instance.
 * This does NOT disconnect automatically beforehand!
 */
export function clearCache(): void {
  instance = null
}

/**
 * Check, if the cached blockchain connection is connected.
 *
 * @returns If there is a cached connection and it is currently connected.
 */
export async function connected(): Promise<boolean> {
  if (!instance) return false
  const resolved = await instance
  return resolved.api.isConnected
}

/**
 * Disconnects the cached connection and clears the cache.
 *
 * @returns If there was a cached and connected connection, or not.
 */
export async function disconnect(): Promise<boolean> {
  const isConnected = await connected()
  if (isConnected) {
    const resolved = await instance
    await resolved?.api.disconnect()
  }
  clearCache()
  return isConnected
}
