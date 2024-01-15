/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'

import { ConfigService } from '@kiltprotocol/config'
import { CType } from '@kiltprotocol/credentials'
import * as Did from '@kiltprotocol/did'
import type {
  AssetDid,
  Did as KiltDid,
  IAssetClaim,
  IClaimContents,
  IPublicCredential,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'

import { ApiMocks } from '../../../../tests/testUtils'
import * as PublicCredential from './PublicCredential.js'

const devAlice = Crypto.makeKeypairFromUri('//Alice')
const nftNameCType = CType.fromProperties('NFT collection name', {
  name: {
    type: 'string',
  },
})
const mockApi = ApiMocks.createAugmentedApi()
ConfigService.set({ api: mockApi })

const testCType = CType.fromProperties('raw ctype', {
  name: { type: 'string' },
})
const assetIdentifier =
  'did:asset:bip122:000000000019d6689c085ae165831e93.slip44:0'

// Build a public credential with fake attestation (i.e., attester, block number, revocation status) information.
function buildCredential(
  assetDid: AssetDid,
  contents: IClaimContents
): IPublicCredential {
  const claim: IAssetClaim = {
    cTypeHash: CType.idToChain(testCType.$id),
    contents,
    subject: assetDid,
  }
  const credential = PublicCredential.fromClaim(claim)
  const attester: KiltDid = Did.getFullDid(devAlice.address)
  return {
    ...credential,
    attester,
    id: PublicCredential.getIdForCredential(credential, attester),
    blockNumber: new BN(0),
    revoked: false,
  }
}

describe('Public credential fromClaim', () => {
  it('should verify the credential claims structure against the ctype', async () => {
    const builtCredential = buildCredential(assetIdentifier, {
      name: 'test-name',
    })
    expect(() =>
      PublicCredential.verifyAgainstCType(builtCredential, testCType)
    ).not.toThrow()
    builtCredential.claims.name = 123
    expect(() =>
      PublicCredential.verifyAgainstCType(builtCredential, testCType)
    ).toThrow()
  })

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
