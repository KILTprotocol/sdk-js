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
import type { ICType } from '@kiltprotocol/types'
import * as Claim from '../claim'
import * as CType from './CType.js'
import { CTypeModel, CTypeModelV1 } from './CType.schemas'

const mockedApi: any = ApiMocks.getMockedApi()
ConfigService.set({ api: mockedApi })

const encodedAliceDid = ApiMocks.mockChainQueryReturn(
  'ctype',
  'cTYPEs',
  '4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
)
const didAlice = 'did:kilt:4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'

it('consistent CType id generation', () => {
  const ctype = CType.fromProperties('CtypeModel 1', {
    'first-property': { type: 'integer' },
    'second-property': { type: 'string' },
  })

  expect(ctype.$id).toMatchInlineSnapshot(
    `"kilt:ctype:0x7ad15687b7e68a694c64cbe3b99a817e26a3bafc9aadb24d5fab19cff1eef319"`
  )
})

it('e2e', () => {
  const claimCtype = CType.fromProperties('CtypeModel 2', {
    name: { type: 'string' },
  })

  const claimContents = {
    name: 'Bob',
  }

  const claim = Claim.fromCTypeAndClaimContents(
    claimCtype,
    claimContents,
    didAlice
  )

  expect(() =>
    CType.verifyClaimAgainstSchema(claim.contents, claimCtype)
  ).not.toThrow()
  claim.contents.name = 123
  expect(() =>
    CType.verifyClaimAgainstSchema(claim.contents, claimCtype)
  ).toThrow()
})

describe('blank ctypes', () => {
  let ctype1: ICType
  let ctype2: ICType

  beforeAll(async () => {
    ctype1 = CType.fromProperties('hasDriversLicense', {})
    ctype2 = CType.fromProperties('claimedSomething', {})
  })

  it('two ctypes with no properties have different hashes if name is different', () => {
    expect(ctype1.$schema).toEqual(ctype2.$schema)
    expect(ctype1.properties).toEqual(ctype2.properties)
    expect(ctype1.title).not.toEqual(ctype2.title)
    expect(ctype1.$id).not.toEqual(ctype2.$id)
  })

  it('typeguard returns true or false for complete or incomplete CTypes', () => {
    expect(CType.isICType(ctype1)).toBe(true)
    expect(CType.isICType({ ...ctype2, owner: '' })).toBe(false)
  })
})

const cTypeV1: ICType = {
  $id: 'kilt:ctype:0x',
  $schema: CTypeModelV1.$id,
  title: 'Ctype Title',
  properties: {
    'first-property': { type: 'integer' },
    'second-property': { type: 'string' },
  },
  type: 'object',
}
cTypeV1.$id = CType.getIdForSchema(cTypeV1)

const cTypeV2: ICType = CType.fromProperties('name', {
  'first-property': { type: 'integer' },
  'second-property': { type: 'string' },
})

describe.each([[cTypeV1], [cTypeV2]])(
  'Claim verification with CType of schema version %#',
  (cType) => {
    const goodClaim = {
      'first-property': 10,
      'second-property': '12',
    }
    const partialClaim = {
      'first-property': 10,
    }
    const badClaim = {
      ...goodClaim,
      'first-property': '1',
    }
    const unexpectedPropsClaim = {
      ...goodClaim,
      'third-property': true,
    }

    it('accepts good CType', () => {
      expect(() => CType.verifyDataStructure(cType)).not.toThrow()
      expect(() =>
        CType.verifyObjectAgainstSchema(cType, CTypeModel)
      ).not.toThrow()
    })

    it('accepts correct & partial claims', () => {
      expect(() =>
        CType.verifyClaimAgainstSchema(goodClaim, cType)
      ).not.toThrow()
      expect(() =>
        CType.verifyClaimAgainstSchema(partialClaim, cType)
      ).not.toThrow()
      expect(() => CType.verifyClaimAgainstSchema({}, cType)).not.toThrow()
    })
    it('rejects incorrect claims', () => {
      expect(() => CType.verifyClaimAgainstSchema(badClaim, cType)).toThrow(
        SDKErrors.ObjectUnverifiableError
      )
      // only the CTypes following the newer model protect against additional properties
      if (cType.$schema === CTypeModelV1.$id) {
        expect(() =>
          CType.verifyClaimAgainstSchema(unexpectedPropsClaim, cType)
        ).not.toThrow()
      } else {
        expect(() =>
          CType.verifyClaimAgainstSchema(unexpectedPropsClaim, cType)
        ).toThrow(SDKErrors.ObjectUnverifiableError)
      }
    })
  }
)

describe.each([[cTypeV1], [cTypeV2]])(
  'CType verification with schema version %#',
  (cType) => {
    it('id verification', () => {
      const wrongIdCtype: ICType = {
        ...cType,
        $id: cType.$id.substring(11) as ICType['$id'],
      }
      const wrongHashCType: ICType = {
        ...cType,
        $id: cType.$id.replace(/[1-9]/, (i) =>
          String(Number(i) - 1)
        ) as ICType['$id'],
      }
      expect(() => CType.verifyDataStructure(wrongIdCtype)).toThrowError(
        SDKErrors.ObjectUnverifiableError
      )
      expect(() => CType.verifyDataStructure(wrongHashCType)).toThrowError(
        SDKErrors.CTypeIdMismatchError
      )
    })
    it('throws error on faulty input', () => {
      const faultySchemaCtype: ICType = {
        ...cType,
        properties: null as unknown as ICType['properties'],
      }
      const wrongSchemaIdCType: ICType = {
        ...cType,
        $schema: cType.$schema.replace(/[1-9]/, (i) =>
          String(Number(i) - 1)
        ) as ICType['$id'],
      }

      expect(() => CType.verifyDataStructure(faultySchemaCtype)).toThrowError(
        SDKErrors.ObjectUnverifiableError
      )
      expect(() => CType.verifyDataStructure(wrongSchemaIdCType)).toThrowError(
        SDKErrors.ObjectUnverifiableError
      )
    })
  }
)

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
