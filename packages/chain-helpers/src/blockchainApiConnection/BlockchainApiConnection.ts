/**
 * Blockchain Api Connection enables the building and accessing of the KILT [[Blockchain]] connection. In which it keeps one connection open and allows to reuse the connection for all [[Blockchain]] related tasks.
 *
 * Other modules can access the [[Blockchain]] as such: `const blockchain = await getConnectionOrConnect()`.
 *
 * @packageDocumentation
 * @module BlockchainApiConnection
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import type { RegistryTypes } from '@polkadot/types/types'
import { ConfigService } from '@kiltprotocol/config'
import Blockchain from '../blockchain/Blockchain'

let instance: Promise<Blockchain> | null

export const CUSTOM_TYPES: RegistryTypes = {
  // Runtime types
  Address: 'MultiAddress',
  AmountOf: 'i128',
  Balance: 'u128',
  BlockNumber: 'u64',
  Index: 'u64',
  LookupSource: 'MultiAddress',

  // Ctype types
  CtypeCreatorOf: 'DidIdentifierOf',
  CtypeHashOf: 'Hash',

  // Attestation types
  ClaimHashOf: 'Hash',
  AttesterOf: 'DidIdentifierOf',
  AttestationDetails: {
    ctypeHash: 'CtypeHashOf',
    attester: 'AttesterOf',
    delegationId: 'Option<DelegationNodeIdOf>',
    revoked: 'bool',
  },

  // Delegation types
  Permissions: 'u32',
  DelegationNodeIdOf: 'Hash',
  DelegatorIdOf: 'DidIdentifierOf',
  DelegationSignature: 'DidSignature',
  DelegationRoot: {
    ctypeHash: 'CtypeHashOf',
    owner: 'DelegatorIdOf',
    revoked: 'bool',
  },
  DelegationNode: {
    rootId: 'DelegationNodeIdOf',
    parent: 'Option<DelegationNodeIdOf>',
    owner: 'DelegatorIdOf',
    permissions: 'Permissions',
    revoked: 'bool',
  },

  // Did types
  KeyIdOf: 'Hash',
  DidIdentifierOf: 'AccountId',
  AccountIdentifierOf: 'AccountId',
  BlockNumberOf: 'BlockNumber',
  DidCallableOf: 'Call',
  DidVerificationKey: {
    _enum: {
      Ed25519: '[u8; 32]',
      Sr25519: '[u8; 32]',
    },
  },
  DidEncryptionKey: {
    _enum: {
      X25519: '[u8; 32]',
    },
  },
  DidPublicKey: {
    _enum: {
      PublicVerificationKey: 'DidVerificationKey',
      PublicEncryptionKey: 'DidEncryptionKey',
    },
  },
  DidVerificationKeyRelationship: {
    _enum: [
      'Authentication',
      'CapabilityDelegation',
      'CapabilityInvocation',
      'AssertionMethod',
    ],
  },
  DidSignature: {
    _enum: {
      Ed25519: 'Ed25519Signature',
      Sr25519: 'Sr25519Signature',
    },
  },
  DidError: {
    _enum: {
      StorageError: 'StorageError',
      SignatureError: 'SignatureError',
      UrlError: 'UrlError',
      InternalError: 'Null',
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
  KeyError: {
    _enum: ['InvalidVerificationKeyFormat', 'InvalidEncryptionKeyFormat'],
  },
  UrlError: {
    _enum: ['InvalidUrlEncoding', 'InvalidUrlScheme'],
  },
  DidPublicKeyDetails: {
    key: 'DidPublicKey',
    blockNumber: 'BlockNumberOf',
  },
  DidDetails: {
    authenticationKey: 'KeyIdOf',
    keyAgreementKeys: 'BTreeSet<KeyIdOf>',
    delegationKey: 'Option<KeyIdOf>',
    attestationKey: 'Option<KeyIdOf>',
    publicKeys: 'BTreeMap<KeyIdOf, DidPublicKeyDetails>',
    endpointUrl: 'Option<Url>',
    lastTxCounter: 'u64',
  },
  DidCreationOperation: {
    did: 'DidIdentifierOf',
    newAuthenticationKey: 'DidVerificationKey',
    newKeyAgreementKeys: 'BTreeSet<DidEncryptionKey>',
    newAttestationKey: 'Option<DidVerificationKey>',
    newDelegationKey: 'Option<DidVerificationKey>',
    newEndpointUrl: 'Option<Url>',
  },
  DidUpdateOperation: {
    did: 'DidIdentifierOf',
    newAuthenticationKey: 'Option<DidVerificationKey>',
    newKeyAgreementKeys: 'BTreeSet<DidEncryptionKey>',
    attestationKeyUpdate: 'DidVerificationKeyUpdateAction',
    delegationKeyUpdate: 'DidVerificationKeyUpdateAction',
    publicKeysToRemove: 'BTreeSet<KeyIdOf>',
    newEndpointUrl: 'Option<Url>',
    txCounter: 'u64',
  },
  DidVerificationKeyUpdateAction: {
    _enum: {
      Ignore: 'Null',
      Change: 'DidVerificationKey',
      Delete: 'Null',
    },
  },
  DidDeletionOperation: {
    did: 'DidIdentifierOf',
    txCounter: 'u64',
  },
  DidAuthorizedCallOperation: {
    did: 'DidIdentifierOf',
    txCounter: 'u64',
    call: 'DidCallableOf',
  },
  HttpUrl: {
    payload: 'Text',
  },
  FtpUrl: {
    payload: 'Text',
  },
  IpfsUrl: {
    payload: 'Text',
  },
  Url: {
    _enum: {
      Http: 'HttpUrl',
      Ftp: 'FtpUrl',
      Ipfs: 'IpfsUrl',
    },
  },

  // Launch types
  LockedBalance: {
    block: 'BlockNumber',
    amount: 'Balance',
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
