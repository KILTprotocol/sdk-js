/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/publicCredential
 */

import type { IAssetClaim } from '@kiltprotocol/types'

import { ApiMocks } from '@kiltprotocol/testing'
import { ConfigService } from '@kiltprotocol/config'
import * as CType from '../ctype'
import * as PublicCredential from '../publicCredential'

const nftNameCType = CType.fromProperties('NFT collection name', {
  name: {
    type: 'string',
  },
})
const mockApi = ApiMocks.createAugmentedApi()
ConfigService.set({ api: mockApi })

const assetIdentifier =
  'did:asset:bip122:000000000019d6689c085ae165831e93.slip44:0'

describe('Public credential fromClaim', () => {
  it('should fail to build a credential from missing claim contents', async () => {
    expect(() =>
      PublicCredential.fromClaim({
        subject: assetIdentifier,
        cTypeHash: CType.getHashForSchema(nftNameCType),
      } as unknown as IAssetClaim)
    ).toThrow()
  })

  it('should fail to build a credential from missing subject', async () => {
    expect(() =>
      PublicCredential.fromClaim({
        contents: {
          name: 'test-name',
        },
        cTypeHash: CType.getHashForSchema(nftNameCType),
      } as unknown as IAssetClaim)
    ).toThrow()
  })

  it('should fail to build a credential from missing ctype hash', async () => {
    expect(() =>
      PublicCredential.fromClaim({
        contents: {
          name: 'test-name',
        },
        subject: assetIdentifier,
      } as unknown as IAssetClaim)
    ).toThrow()
  })

  it('should fail to build a credential from invalid subject', async () => {
    expect(() =>
      PublicCredential.fromClaim({
        contents: {
          name: 'test-name',
        },
        subject: 'did:asset',
        cTypeHash: CType.getHashForSchema(nftNameCType),
      } as unknown as IAssetClaim)
    ).toThrow()
  })

  it('should fail to build a credential from ctype hash != than HEX', async () => {
    expect(() =>
      PublicCredential.fromClaim({
        contents: {
          name: 'test-name',
        },
        subject: 'did:asset',
        cTypeHash: '0x',
      } as unknown as IAssetClaim)
    ).toThrow()
  })

  it('should fail to build a credential from a delegation node != than a string', async () => {
    expect(() =>
      PublicCredential.fromClaim(
        {
          contents: {
            name: 'test-name',
          },
          subject: 'did:asset',
          cTypeHash: '0x',
        } as unknown as IAssetClaim,
        { delegationId: 3 as any }
      )
    ).toThrow()
  })
})
