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
  IAssetClaim,
  IClaimContents,
  INewPublicCredential,
} from '@kiltprotocol/types'
import * as CType from '../ctype'
import * as PublicCredential from '../publicCredential'

const testCType = CType.fromProperties('raw ctype', {
  name: { type: 'string' },
})

function buildCredential(
  assetDid: AssetDidUri,
  contents: IClaimContents
): INewPublicCredential {
  const claim: IAssetClaim = {
    cTypeHash: CType.idToChain(testCType.$id),
    contents,
    subject: assetDid,
  }
  const credential = PublicCredential.fromClaim(claim)
  return credential
}

describe('Public credential', () => {
  const assetIdentifier =
    'did:asset:bip122:000000000019d6689c085ae165831e93.slip44:0'

  it('should verify the credential claims structure against the ctype', async () => {
    const builtCredential = buildCredential(assetIdentifier, {
      a: 'a',
      b: 'b',
      c: 'c',
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
