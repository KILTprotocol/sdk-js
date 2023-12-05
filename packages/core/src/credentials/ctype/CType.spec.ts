/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ConfigService } from '@kiltprotocol/config'
import type { ICType } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { ApiMocks } from '../../../../../tests/testUtils'
import * as CType from './CType.js'
import { CTypeModel, CTypeModelDraft01 } from './CType.schemas'

const mockedApi: any = ApiMocks.getMockedApi()
ConfigService.set({ api: mockedApi })

const encodedAliceDid = ApiMocks.mockChainQueryReturn(
  'ctype',
  'cTYPEs',
  '4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
)

it('consistent CType id generation', () => {
  const ctypeV1 = CType.fromProperties('CtypeModel 1', {
    'first-property': { type: 'integer' },
    'second-property': { type: 'string' },
  })

  expect(ctypeV1.$id).toMatchInlineSnapshot(
    `"kilt:ctype:0xc4145b9c5c7ae10f60c6a707b9dabf704ab65d7802a839854643a579c9bc80a5"`
  )

  const ctypeV0 = CType.fromProperties(
    'CtypeModel 1',
    {
      'first-property': { type: 'integer' },
      'second-property': { type: 'string' },
    },
    'draft-01'
  )

  expect(ctypeV0.$id).toMatchInlineSnapshot(
    `"kilt:ctype:0xba15bf4960766b0a6ad7613aa3338edce95df6b22ed29dd72f6e72d740829b84"`
  )
})

describe('value constraints', () => {
  let cTypeWithConstraints: ICType
  beforeAll(() => {
    cTypeWithConstraints = CType.fromProperties('ConstraintsCtype', {
      labels: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['important', 'vital', 'critical', 'essential'],
        },
        minItems: 1,
        maxItems: 3,
      },
      w3n: {
        type: 'string',
        minLength: 3,
        maxLength: 10,
      },
      date: {
        type: 'string',
        format: 'date',
      },
      age: {
        type: 'integer',
        minimum: 0,
        maximum: 999,
      },
      multiplier: {
        type: 'number',
        enum: [0.2, 0.6, 1.2, 2.4],
      },
    })
  })

  it('constrains array length', () => {
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          labels: ['critical'],
        },
        cTypeWithConstraints
      )
    ).not.toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          labels: ['important', 'critical'],
        },
        cTypeWithConstraints
      )
    ).not.toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          labels: ['important', 'critical', 'essential'],
        },
        cTypeWithConstraints
      )
    ).not.toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          labels: [],
        },
        cTypeWithConstraints
      )
    ).toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          labels: ['important', 'vital', 'critical', 'essential'],
        },
        cTypeWithConstraints
      )
    ).toThrow()
  })

  it('constrains array contents via enum', () => {
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          labels: ['important', 'critical', 'essential'],
        },
        cTypeWithConstraints
      )
    ).not.toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          labels: ['niceToHave'],
        },
        cTypeWithConstraints
      )
    ).toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          labels: [12],
        },
        cTypeWithConstraints
      )
    ).toThrow()
  })

  it('constrains string length', () => {
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          w3n: 'juergen',
        },
        cTypeWithConstraints
      )
    ).not.toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          w3n: 'jo',
        },
        cTypeWithConstraints
      )
    ).toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          w3n: 'Peter der Große, Zar von Russland',
        },
        cTypeWithConstraints
      )
    ).toThrow()
  })

  it('constrains numeric range', () => {
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          age: 22,
        },
        cTypeWithConstraints
      )
    ).not.toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          age: -12,
        },
        cTypeWithConstraints
      )
    ).toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          age: 1000,
        },
        cTypeWithConstraints
      )
    ).toThrow()
  })

  it('constrains to numbers in enum', () => {
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          multiplier: 1.2,
        },
        cTypeWithConstraints
      )
    ).not.toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          multiplier: 1,
        },
        cTypeWithConstraints
      )
    ).toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          multiplier: 0.14,
        },
        cTypeWithConstraints
      )
    ).toThrow()
  })

  it('constrains string to date format', () => {
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          date: '2022-01-22',
        },
        cTypeWithConstraints
      )
    ).not.toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          date: '11:30',
        },
        cTypeWithConstraints
      )
    ).toThrow()
    expect(() =>
      CType.verifyClaimAgainstSchema(
        {
          date: 'fried fish',
        },
        cTypeWithConstraints
      )
    ).toThrow()
  })
})

it('e2e', () => {
  const claimCtype = CType.fromProperties('CtypeModel 2', {
    name: { type: 'string' },
  })

  const claimContents = {
    name: 'Bob',
  }

  expect(() =>
    CType.verifyClaimAgainstSchema(claimContents, claimCtype)
  ).not.toThrow()
  // @ts-expect-error
  claimContents.name = 123
  expect(() =>
    CType.verifyClaimAgainstSchema(claimContents, claimCtype)
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

const cTypeDraft01: ICType = CType.fromProperties(
  'name',
  {
    'first-property': { type: 'integer' },
    'second-property': { type: 'string' },
  },
  'draft-01'
)

const cTypeV1: ICType = CType.fromProperties('name', {
  'first-property': { type: 'integer' },
  'second-property': { type: 'string' },
})

describe.each([[cTypeDraft01], [cTypeV1]])(
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
      if (cType.$schema === CTypeModelDraft01.$id) {
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

describe.each([[cTypeDraft01], [cTypeV1]])(
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
  const cType = CType.fromProperties('CtypeModel 2', {
    name: { type: 'string' },
  })

  describe('when CType is not registered', () => {
    it('does not verify registration when not registered', async () => {
      await expect(CType.verifyStored(cType)).rejects.toThrow()
    })
  })

  describe('when CType is registered', () => {
    beforeAll(() => {
      mockedApi.query.ctype.ctypes.mockResolvedValue(encodedAliceDid)
    })

    it('verifies registration when owner not set', async () => {
      await expect(CType.verifyStored(cType)).resolves.not.toThrow()
    })

    it('verifies registration when owner matches', async () => {
      await expect(CType.verifyStored(cType)).resolves.not.toThrow()
    })

    it('verifies registration when owner does not match', async () => {
      await expect(CType.verifyStored(cType)).resolves.not.toThrow()
    })
  })
})
