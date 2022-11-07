/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/publicCredential
 */

import type {
  AssetDidUri,
  DidUri,
  IAssetClaim,
  IClaimContents,
  IPublicCredential,
} from '@kiltprotocol/types'

import { BN } from '@polkadot/util'
import { ApiMocks } from '@kiltprotocol/testing'
import { ConfigService } from '@kiltprotocol/config'
import * as Did from '@kiltprotocol/did'
import { devAlice } from '../__integrationtests__/utils'
import * as CType from '../ctype'
import * as PublicCredential from '../publicCredential'

const testCType = CType.fromProperties('raw ctype', {
  name: { type: 'string' },
})

const mockApi = ApiMocks.createAugmentedApi()
ConfigService.set({ api: mockApi })

// Build a public credential with fake attestation (i.e., attester, block number, revocation status) information.
function buildCredential(
  assetDid: AssetDidUri,
  contents: IClaimContents
): IPublicCredential {
  const claim: IAssetClaim = {
    cTypeHash: CType.idToChain(testCType.$id),
    contents,
    subject: assetDid,
  }
  const credential = PublicCredential.fromClaim(claim)
  const attester: DidUri = Did.getFullDidUri(devAlice.address)
  return {
    ...credential,
    attester,
    id: PublicCredential.computeId(credential, attester),
    blockNumber: new BN(0),
    revoked: false,
  }
}

describe('Public credential', () => {
  const assetIdentifier =
    'did:asset:bip122:000000000019d6689c085ae165831e93.slip44:0'

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
})
