/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import type {
  AssetDidUri,
  ConformingAssetDidResolutionResult,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import type { ResolvedAssetDid } from './Resolver'
import { resolve, resolveCompliant } from './Resolver'

describe('Resolver.resolve', () => {
  it('should correctly resolve a valid AssetDID without an asset identifier', async () => {
    const assetDid =
      'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
    expect(resolve(assetDid)).toMatchObject<ResolvedAssetDid>({
      uri: 'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      chainId: 'eip155:1',
      chainNamespace: 'eip155',
      chainReference: '1',
      assetId: 'erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      assetNamespace: 'erc20',
      assetReference: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      assetInstance: undefined,
    })
  })
  it('should correctly resolve a valid AssetDID with an asset identifier', async () => {
    const assetDid =
      'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F:123'
    expect(resolve(assetDid)).toMatchObject<ResolvedAssetDid>({
      uri: 'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F:123',
      chainId: 'eip155:1',
      chainNamespace: 'eip155',
      chainReference: '1',
      assetId: 'erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F:123',
      assetNamespace: 'erc20',
      assetReference: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      assetInstance: '123',
    })
  })
  it('should fail to resolve invalid AssetDIDs', async () => {
    const assetDids: string[] = [
      'did',
      'did:',
      'did:asset',
      'did:asset:',
      'did:asset:eip155',
      'did:asset:eip155:',
      'did:asset:eip155:1',
      'did:asset:eip155:1.',
      'did:asset:eip155:1.erc20',
      'did:asset:eip155:1.erc20:',
      'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F:',
      'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F:123:',
    ]
    assetDids.forEach((assetDid) =>
      expect(() => resolve(assetDid as AssetDidUri)).toThrowError(
        new SDKErrors.InvalidDidFormatError(assetDid)
      )
    )
  })
})

describe('Resolver.resolveCompliant', () => {
  it('should correctly resolve a valid AssetDID without an asset identifier', async () => {
    const assetDid =
      'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
    expect(
      resolveCompliant(assetDid)
    ).toMatchObject<ConformingAssetDidResolutionResult>({
      didDocument: {
        id: 'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        chain: {
          namespace: 'eip155',
          reference: '1',
        },
        asset: {
          namespace: 'erc20',
          reference: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          identifier: undefined,
        },
      },
      didDocumentMetadata: {},
      didResolutionMetadata: {},
    })
  })
  it('should correctly resolve a valid AssetDID with an asset identifier', async () => {
    const assetDid =
      'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F:123'
    expect(
      resolveCompliant(assetDid)
    ).toMatchObject<ConformingAssetDidResolutionResult>({
      didDocument: {
        id: 'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F:123',
        chain: {
          namespace: 'eip155',
          reference: '1',
        },
        asset: {
          namespace: 'erc20',
          reference: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          identifier: '123',
        },
      },
      didDocumentMetadata: {},
      didResolutionMetadata: {},
    })
  })
  it('should fail to resolve invalid AssetDIDs', async () => {
    const assetDids: string[] = [
      'did',
      'did:',
      'did:asset',
      'did:asset:',
      'did:asset:eip155',
      'did:asset:eip155:',
      'did:asset:eip155:1',
      'did:asset:eip155:1.',
      'did:asset:eip155:1.erc20',
      'did:asset:eip155:1.erc20:',
      'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F:',
      'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F:123:',
    ]
    assetDids.forEach((assetDid) =>
      expect(
        resolveCompliant(assetDid as AssetDidUri)
      ).toMatchObject<ConformingAssetDidResolutionResult>({
        didDocument: undefined,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'invalidDid',
          errorMessage: new SDKErrors.InvalidDidFormatError(assetDid).message,
        },
      })
    )
  })
})
