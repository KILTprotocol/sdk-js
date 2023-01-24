/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/ctype
 */

import { SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import { ApiMocks } from '@kiltprotocol/testing'
import type { ICType, IClaim } from '@kiltprotocol/types'
import * as Claim from '../claim'
import * as Credential from '../credential'
import * as CType from './CType.js'
import { CTypeModel } from './CType.schemas'

const mockedApi: any = ApiMocks.getMockedApi()
ConfigService.set({ api: mockedApi })

const encodedAliceDid = ApiMocks.mockChainQueryReturn(
  'ctype',
  'cTYPEs',
  '4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
)
const didAlice = 'did:kilt:4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'

describe('CType', () => {
  let claimCtype: ICType
  let claimContents: any
  let claim: IClaim
  beforeAll(async () => {
    claimCtype = CType.fromProperties('CtypeModel 2', {
      name: { type: 'string' },
    })

    claimContents = {
      name: 'Bob',
    }

    claim = Claim.fromCTypeAndClaimContents(claimCtype, claimContents, didAlice)
  })

  it('makes ctype object from schema without id', () => {
    const ctype = CType.fromProperties('CtypeModel 1', {
      'first-property': { type: 'integer' },
      'second-property': { type: 'string' },
    })

    expect(ctype.$id).toBe(
      'kilt:ctype:0xba15bf4960766b0a6ad7613aa3338edce95df6b22ed29dd72f6e72d740829b84'
    )
  })

  it('verifies the claim structure', () => {
    expect(() =>
      CType.verifyClaimAgainstSchema(claim.contents, claimCtype)
    ).not.toThrow()
    claim.contents.name = 123
    expect(() =>
      CType.verifyClaimAgainstSchema(claim.contents, claimCtype)
    ).toThrow()
  })

  it('throws error on faulty input', () => {
    const wrongHashCtype: ICType = {
      ...claimCtype,
      $id: 'kilt:ctype:0x1234',
    }
    const faultySchemaCtype: ICType = {
      ...claimCtype,
      properties: null as unknown as ICType['properties'],
    }

    const wrongSchemaIdCType: ICType = {
      ...claimCtype,
      $id: claimCtype.$id.replace('1', '2') as ICType['$id'],
    }
    expect(() => CType.verifyDataStructure(wrongHashCtype)).toThrowError(
      SDKErrors.CTypeIdMismatchError
    )
    expect(() => CType.verifyDataStructure(faultySchemaCtype)).toThrowError(
      SDKErrors.ObjectUnverifiableError
    )
    expect(() =>
      CType.verifyDataStructure(wrongSchemaIdCType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Provided $id \\"kilt:ctype:0xd5302762c62114f6455e0b373cccce20631c2a717004a98f8953e738e17c5d3c\\" does not match schema $id \\"kilt:ctype:0xd5301762c62114f6455e0b373cccce20631c2a717004a98f8953e738e17c5d3c\\""`
    )
  })

  it('verifies whether a ctype is registered on chain ', async () => {
    await expect(CType.verifyStored(claimCtype)).rejects.toThrow()

    mockedApi.query.ctype.ctypes.mockResolvedValueOnce(encodedAliceDid)
    await expect(CType.verifyStored(claimCtype)).resolves.not.toThrow()
  })
})

describe('blank ctypes', () => {
  let ctype1: ICType
  let ctype2: ICType

  beforeAll(async () => {
    ctype1 = CType.fromProperties('hasDriversLicense', {})
    ctype2 = CType.fromProperties('claimedSomething', {})
  })

  it('two ctypes with no properties have different hashes if id is different', () => {
    expect(ctype1.$schema).toEqual(ctype2.$schema)
    expect(ctype1.properties).toEqual(ctype2.properties)
    expect(ctype1.title).not.toEqual(ctype2.title)
    expect(ctype1.$id).not.toEqual(ctype2.$id)
  })

  it('two claims on an empty ctypes will have different root hash', async () => {
    const claimA1 = Claim.fromCTypeAndClaimContents(ctype1, {}, didAlice)
    const claimA2 = Claim.fromCTypeAndClaimContents(ctype2, {}, didAlice)

    expect(Credential.fromClaim(claimA1).rootHash).not.toEqual(
      Credential.fromClaim(claimA2).rootHash
    )
  })
  it('typeguard returns true or false for complete or incomplete CTypes', () => {
    expect(CType.isICType(ctype1)).toBe(true)
    expect(CType.isICType({ ...ctype2, owner: '' })).toBe(false)
  })
})

describe('CType verification', () => {
  const ctypeInput = {
    $id: 'kilt:ctype:0x1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype-input#',
    title: 'Ctype Title',
    properties: [
      {
        $id: 'kilt:ctype:0xfirst-property',
        $ref: 'First Property',
        type: 'integer',
      },
      {
        $id: 'kilt:ctype:0xsecond-property',
        $ref: 'Second Property',
        type: 'string',
      },
    ],
    type: 'object',
    required: ['first-property', 'second-property'],
  } as unknown as ICType

  const ctypeWrapperModel: ICType = CType.fromProperties('name', {
    'first-property': { type: 'integer' },
    'second-property': { type: 'string' },
  })

  const goodClaim = {
    'first-property': 10,
    'second-property': '12',
  }

  const badClaim = {
    'first-property': '1',
    'second-property': '12',
    'third-property': true,
  }
  it('verifies claims', () => {
    expect(() =>
      CType.verifyClaimAgainstSchema(goodClaim, ctypeWrapperModel)
    ).not.toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(badClaim, ctypeWrapperModel)
    ).toThrow()
    expect(() =>
      CType.verifyObjectAgainstSchema(badClaim, CTypeModel, [])
    ).toThrow()
    expect(() => {
      CType.verifyClaimAgainstSchema(badClaim, ctypeInput)
    }).toThrow(SDKErrors.ObjectUnverifiableError)
  })
  it('verifies ctypes', () => {
    expect(() =>
      CType.verifyObjectAgainstSchema(ctypeWrapperModel, CTypeModel)
    ).not.toThrow()
  })
})

describe('CType registration verification', () => {
  const ctype = CType.fromProperties('CtypeModel 2', {
    name: { type: 'string' },
  })

  describe('when CType is not registered', () => {
    it('does not verify registration when not registered', async () => {
      await expect(CType.verifyStored(ctype)).rejects.toThrow()
    })
  })

  describe('when CType is registered', () => {
    beforeAll(() => {
      mockedApi.query.ctype.ctypes.mockResolvedValue(encodedAliceDid)
    })

    it('verifies registration when owner not set', async () => {
      await expect(CType.verifyStored(ctype)).resolves.not.toThrow()
    })

    it('verifies registration when owner matches', async () => {
      await expect(CType.verifyStored(ctype)).resolves.not.toThrow()
    })

    it('verifies registration when owner does not match', async () => {
      await expect(CType.verifyStored(ctype)).resolves.not.toThrow()
    })
  })
})
