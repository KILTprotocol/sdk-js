/**
 * Blockchain Api Connection enables the building and accessing of the KILT [[Blockchain]] connection. In which it keeps one connection open and allows to reuse the connection for all [[Blockchain]] related tasks.
 *
 * Other modules can access the [[Blockchain]] as such: `const blockchain = await getCached()`.
 *
 * @packageDocumentation
 * @module BlockchainApiConnection
 * @preferred
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import { RegistryTypes } from '@polkadot/types/types'
import { ConfigService } from '@kiltprotocol/config'
import Blockchain from '../blockchain/Blockchain'

let instance: Promise<Blockchain> | null

export const CUSTOM_TYPES: RegistryTypes = {
  PublicSigningKey: 'Hash',
  PublicBoxKey: 'Hash',
  Signature: 'MultiSignature',
  Address: 'AccountId',
  LookupSource: 'AccountId',
  BlockNumber: 'u64',
  Index: 'u64',
  RefCount: 'u32',

  ErrorCode: 'u16',
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
  Did: {
    signKey: 'Hash',
    boxKey: 'Hash',
    docRef: 'Option<Vec<u8>>',
  },
}

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

export async function getCached(
  host: string = ConfigService.get('address')
): Promise<Blockchain> {
  if (!instance) {
    instance = buildConnection(host)
  }
  return instance
}

export function clearCache(): void {
  instance = null
}

export default getCached
