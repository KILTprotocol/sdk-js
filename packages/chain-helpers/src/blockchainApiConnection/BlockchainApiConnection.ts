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
  Signature: 'MultiSignature',
  Address: 'AccountId',
  LookupSource: 'AccountId',
  BlockNumber: 'u64',
  Index: 'u64',
  RefCount: 'u32',
  AccountInfo: 'AccountInfoWithProviders',
  Permissions: 'u32',
  DelegationNodeId: 'Hash',
  DelegationNode: {
    rootId: 'DelegationNodeId',
    parent: 'Option<DelegationNodeId>',
    owner: 'AccountId',
    permissions: 'Permissions',
    revoked: 'bool',
  },
  DelegationRoot: {
    ctypeHash: 'Hash',
    owner: 'AccountId',
    revoked: 'bool',
  },
  Attestation: {
    ctypeHash: 'Hash',
    attester: 'AccountId',
    delegationId: 'Option<DelegationNodeId>',
    revoked: 'bool',
  },
  UrlEncoding: 'Vec<u8>',
  DidIdentifier: 'AccountId',
  DidVerificationKeyType: {
    _enum: [
      'Authentication',
      'CapabilityDelegation',
      'CapabilityInvocation',
      'AssertionMethod',
    ],
  },
  DidEncryptionKeyType: {
    _enum: ['KeyAgreement'],
  },
  PublicVerificationKey: {
    _enum: {
      Ed25519: '[u8; 32]',
      Sr25519: '[u8; 32]',
    },
  },
  DidSignature: {
    _enum: {
      Ed25519: '[u8; 64]',
      Sr25519: '[u8; 64]',
    },
  },
  PublicEncryptionKey: {
    _enum: {
      X55519: '[u8; 32]',
    },
  },
  DIDError: {
    _enum: {
      StorageError: 'StorageError',
      SignatureError: 'SignatureError',
    },
  },
  StorageError: {
    _enum: {
      DIDAlreadyPresent: 'null',
      DIDNotPresent: 'null',
      VerificationkeyNotPresent: 'DidVerificationKeyType',
    },
  },
  SignatureError: {
    _enum: ['InvalidSignatureFormat', 'InvalidSignature'],
  },
  DidCreationOperation: {
    did: 'DidIdentifier',
    new_auth_key: 'PublicVerificationKey',
    new_key_agreement_key: 'PublicEncryptionKey',
    new_attestation_key: 'Option<PublicVerificationKey>',
    new_delegation_key: 'Option<PublicVerificationKey>',
    new_endpoint_url: 'Option<UrlEncoding>',
  },
  DidDetails: {
    auth_key: 'PublicVerificationKey',
    key_agreement_key: 'PublicEncryptionKey',
    delegation_key: 'Option<PublicVerificationKey>',
    attestation_key: 'Option<PublicVerificationKey>',
    verification_keys: 'BTreeSet<PublicVerificationKey>',
    endpoint_url: 'Option<UrlEncoding>',
    last_tx_counter: 'u64',
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
