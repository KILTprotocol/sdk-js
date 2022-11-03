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
import { nftNameCType } from '../__integrationtests__/utils'

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

  it('should fail to verify if the credential is not valid', async () => {
    const builtCredential = buildCredential(assetIdentifier, {
      name: 'test',
    })
    expect(() =>
      PublicCredential.verifyCredential(builtCredential, {
        ctype: nftNameCType,
      })
    ).not.toThrow()
    const noClaims = { ...builtCredential }
    delete (noClaims as any).claims
    expect(() =>
      PublicCredential.verifyCredential(noClaims, {
        ctype: nftNameCType,
      })
    ).toThrow()
    const noCtypeHash = { ...builtCredential }
    delete (noCtypeHash as any).cTypeHash
    expect(() =>
      PublicCredential.verifyCredential(noCtypeHash, {
        ctype: nftNameCType,
      })
    ).toThrow()
    const noSubject = {
      ...builtCredential,
    }
    delete (noSubject as any).subject
    expect(() =>
      PublicCredential.verifyCredential(noSubject, {
        ctype: nftNameCType,
      })
    ).toThrow()
    const invalidSubject = {
      ...builtCredential,
      subject: 'test-subject',
    }
    expect(() =>
      PublicCredential.verifyCredential(invalidSubject as any, {
        ctype: nftNameCType,
      })
    ).toThrow()
    const invalidCtypeHash = {
      ...builtCredential,
      cTypeHash: 49,
    }
    expect(() =>
      PublicCredential.verifyCredential(invalidCtypeHash as any, {
        ctype: nftNameCType,
      })
    ).toThrow()
    const wrongDelegationIdType = {
      ...builtCredential,
      delegationId: 3,
    }
    expect(() =>
      PublicCredential.verifyCredential(wrongDelegationIdType as any, {
        ctype: nftNameCType,
      })
    ).toThrow()
    const invalidClaimsFormat = {
      ...builtCredential,
      claims: {
        // Numeric value not accepted. The `name` property must be a string.
        name: 4,
      },
    }
    expect(() =>
      PublicCredential.verifyCredential(invalidClaimsFormat, {
        ctype: nftNameCType,
      })
    ).toThrow()
  })
})
