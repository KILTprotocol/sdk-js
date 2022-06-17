/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/ctype
 */

import type { ICType } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import {
  verifyClaimStructure,
  verifySchema,
  verifySchemaWithErrors,
} from './CType.utils'
import { CTypeModel, CTypeWrapperModel } from './CTypeSchema'
import { CType } from './index'
import { getOwner, isStored } from './CType.chain'

jest.mock('./CType.chain')

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

describe('CTypeUtils', () => {
  it('verifies claims', () => {
    expect(verifyClaimStructure(goodClaim, ctypeWrapperModel)).toBeTruthy()
    expect(verifyClaimStructure(badClaim, ctypeWrapperModel)).toBeFalsy()
    expect(verifySchemaWithErrors(badClaim, CTypeWrapperModel, [])).toBeFalsy()
    expect(() => {
      verifyClaimStructure(badClaim, ctypeInput)
    }).toThrow(SDKErrors.ERROR_OBJECT_MALFORMED)
  })
  it('verifies ctypes', () => {
    expect(verifySchema(ctypeWrapperModel, CTypeModel)).toBeTruthy()
  })
})

describe('CType registration verification', () => {
  const didAlice = 'did:kilt:4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
  const didBob = 'did:kilt:4rDeMGr3Hi4NfxRUp8qVyhvgW3BSUBLneQisGa9ASkhh2sXB'

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
    beforeAll(() => {
      ;(getOwner as jest.Mock).mockReturnValue(null)
      ;(isStored as jest.Mock).mockReturnValue(false)
    })

    it('does not verify registration when not registered', async () => {
      const ctype = CType.fromSchema(rawCType, didAlice)
      await expect(ctype.verifyStored()).resolves.toBeFalsy()
    })

    it('does not verify owner when not registered', async () => {
      const ctype = CType.fromSchema(rawCType, didAlice)
      await expect(ctype.verifyOwner()).resolves.toBeFalsy()
    })
  })

  describe('when CType is registered', () => {
    beforeAll(() => {
      ;(getOwner as jest.Mock).mockReturnValue(didAlice)
      ;(isStored as jest.Mock).mockReturnValue(true)
    })

    it('verifies registration when owner not set', async () => {
      const ctype = CType.fromSchema(rawCType)
      await expect(ctype.verifyStored()).resolves.toBeTruthy()
    })

    it('verifies registration when owner matches', async () => {
      const ctype = CType.fromSchema(rawCType, didAlice)
      await expect(ctype.verifyStored()).resolves.toBeTruthy()
    })

    it('verifies registration when owner does not match', async () => {
      const ctype = CType.fromSchema(rawCType, didBob)
      await expect(ctype.verifyStored()).resolves.toBeTruthy()
    })

    it('verifies owner when owner matches', async () => {
      const ctype = CType.fromSchema(rawCType, didAlice)
      await expect(ctype.verifyOwner()).resolves.toBeTruthy()
    })

    it('does not verify owner when owner does not match', async () => {
      const ctype = CType.fromSchema(rawCType, didBob)
      await expect(ctype.verifyOwner()).resolves.toBeFalsy()
    })
  })
})
