/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
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
import type {
  ICType,
  CTypeSchemaWithoutId,
  ICTypeSchema,
  IClaim,
} from '@kiltprotocol/types'
import * as Claim from '../claim'
import * as Credential from '../credential'
import * as CType from './CType.js'
import { CTypeModel, CTypeWrapperModel } from './CType.schemas'

const mockedApi: any = ApiMocks.getMockedApi()
ConfigService.set({ api: mockedApi })

const encodedAliceDid = ApiMocks.mockChainQueryReturn(
  'ctype',
  'cTYPEs',
  '4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
)
const didAlice = 'did:kilt:4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
const didBob = 'did:kilt:4rDeMGr3Hi4NfxRUp8qVyhvgW3BSUBLneQisGa9ASkhh2sXB'

describe('CType', () => {
  let ctypeSchemaWithoutId: CTypeSchemaWithoutId
  let rawCType: ICType['schema']
  let claimCtype: ICType
  let claimContents: any
  let claim: IClaim
  beforeAll(async () => {
    rawCType = {
      $id: 'kilt:ctype:0x2',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'CtypeModel 2',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    ctypeSchemaWithoutId = {
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'CtypeModel 1',
      properties: {
        'first-property': { type: 'integer' },
        'second-property': { type: 'string' },
      },
      type: 'object',
    }

    claimCtype = CType.fromSchema(rawCType, didAlice)

    claimContents = {
      name: 'Bob',
    }

    claim = Claim.fromCTypeAndClaimContents(claimCtype, claimContents, didAlice)
  })

  it('makes ctype object from schema without id', () => {
    const ctype = CType.fromSchema(ctypeSchemaWithoutId, didAlice)

    expect(ctype.schema.$id).toBe(
      'kilt:ctype:0xba15bf4960766b0a6ad7613aa3338edce95df6b22ed29dd72f6e72d740829b84'
    )
  })

  it('verifies the claim structure', () => {
    expect(() =>
      CType.verifyClaimAgainstSchema(claim.contents, claimCtype.schema)
    ).not.toThrow()
    claim.contents.name = 123
    expect(() => 
      CType.verifyClaimAgainstSchema(claim.contents, claimCtype.schema)
    ).toThrow()
  })

  it('throws error on faulty input', () => {
    const wrongHashCtype: ICType = {
      ...claimCtype,
      hash: '0x1234',
    }
    const faultySchemaCtype: ICType = {
      ...claimCtype,
      schema: { ...rawCType, properties: null } as unknown as ICTypeSchema,
    }
    const invalidAddressCtype: ICType = {
      ...claimCtype,
      // @ts-ignore
      owner: claimCtype.owner!.replace('4', 'D'),
    }

    // This tst is not possible as it throws the error for malformed object first
    // TODO: Discuss whether the specific check in the verifyDataStructure is obsolete and therefore should be removed
    const faultyAddressTypeCType: ICType = {
      schema: claimCtype.schema,
      hash: claimCtype.hash,
      owner: '4262626426',
    } as any as ICType

    const wrongSchemaIdCType: ICType = {
      ...claimCtype,
      schema: {
        ...claimCtype.schema,
        $id: claimCtype.schema.$id.replace('1', '2'),
      },
    }
    expect(() => CType.verifyDataStructure(wrongHashCtype)).toThrowError(
      SDKErrors.HashMalformedError
    )
    expect(() => CType.verifyDataStructure(faultySchemaCtype)).toThrowError(
      SDKErrors.ObjectUnverifiableError
    )
    expect(() =>
      CType.verifyDataStructure(invalidAddressCtype)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Not a valid KILT DID \\"did:kilt:Dp6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N\\""`
    )
    expect(() =>
      CType.verifyDataStructure(faultyAddressTypeCType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Not a valid KILT DID \\"4262626426\\""`
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
  let ctypeSchema1: ICType['schema']
  let ctypeSchema2: ICType['schema']
  let ctype1: ICType
  let ctype2: ICType

  beforeAll(async () => {
    ctypeSchema1 = {
      $id: 'kilt:ctype:0x3',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'hasDriversLicense',
      properties: {},
      type: 'object',
    }

    ctypeSchema2 = {
      $id: 'kilt:ctype:0x4',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'claimedSomething',
      properties: {},
      type: 'object',
    }

    ctype1 = CType.fromSchema(ctypeSchema1, didAlice)
    ctype2 = CType.fromSchema(ctypeSchema2, didAlice)
  })

  it('two ctypes with no properties have different hashes if id is different', () => {
    expect(ctype1.owner).toEqual(ctype2.owner)
    expect(ctype1.schema).not.toEqual(ctype2.schema)
    expect(ctype1.hash).not.toEqual(ctype2.hash)
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
  } as any as ICType['schema']

  const ctypeWrapperModel: ICType['schema'] = {
    $id: 'kilt:ctype:0x2',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'name',
    properties: {
      'first-property': { type: 'integer' },
      'second-property': { type: 'string' },
    },
    type: 'object',
  }

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
      CType.verifyObjectAgainstSchema(badClaim, CTypeWrapperModel, [])
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
  const rawCType = {
    $id: 'kilt:ctype:0x2',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'CtypeModel 2',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  } as ICType['schema']

  describe('when CType is not registered', () => {
    it('does not verify registration when not registered', async () => {
      const ctype = CType.fromSchema(rawCType, didAlice)
      await expect(CType.verifyStored(ctype)).rejects.toThrow()
    })
  })

  describe('when CType is registered', () => {
    beforeAll(() => {
      mockedApi.query.ctype.ctypes.mockResolvedValue(encodedAliceDid)
    })

    it('verifies registration when owner not set', async () => {
      const ctype = CType.fromSchema(rawCType)
      await expect(CType.verifyStored(ctype)).resolves.not.toThrow()
    })

    it('verifies registration when owner matches', async () => {
      const ctype = CType.fromSchema(rawCType, didAlice)
      await expect(CType.verifyStored(ctype)).resolves.not.toThrow()
    })

    it('verifies registration when owner does not match', async () => {
      const ctype = CType.fromSchema(rawCType, didBob)
      await expect(CType.verifyStored(ctype)).resolves.not.toThrow()
    })
  })
})
