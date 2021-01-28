/**
 * @packageDocumentation
 * @group unit/ctype
 * @ignore
 */

import { ICType } from '@kiltprotocol/types'
import { ERROR_OBJECT_MALFORMED } from '../errorhandling/SDKErrors'
import {
  verifyClaimStructure,
  verifySchema,
  verifySchemaWithErrors,
} from './CType.utils'
import { CTypeModel, CTypeWrapperModel } from './CTypeSchema'
import CType from '.'
import { Identity } from '..'

jest.mock('./CType.chain')

const ctypeInput = ({
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
} as any) as ICType['schema']

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
    }).toThrow(ERROR_OBJECT_MALFORMED())
  })
  it('verifies ctypes', () => {
    expect(verifySchema(ctypeWrapperModel, CTypeModel)).toBeTruthy()
  })
})

describe('CType registration verification', () => {
  const getOwnerMock = require('./CType.chain').getOwner

  let identityAlice: Identity
  let identityBob: Identity

  const rawCType = {
    $id: 'kilt:ctype:0x2',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'CtypeModel 2',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  } as ICType['schema']

  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')
    identityBob = Identity.buildFromURI('//Bob')
  }, 30_000)

  describe('when CType is not registered', () => {
    beforeAll(() => {
      getOwnerMock.mockReturnValue(null)
    })

    it('does not verify registration when not registered', async () => {
      const ctype = CType.fromSchema(rawCType, identityAlice.address)
      await expect(ctype.verifyStored()).resolves.toBeFalsy()
    })

    it('does not verify owner when not registered', async () => {
      const ctype = CType.fromSchema(rawCType, identityAlice.address)
      await expect(ctype.verifyOwner()).resolves.toBeFalsy()
    })
  })

  describe('when CType is registered', () => {
    beforeAll(() => {
      getOwnerMock.mockReturnValue(identityAlice.address)
    })

    it('verifies registration when owner not set', async () => {
      const ctype = CType.fromSchema(rawCType)
      await expect(ctype.verifyStored()).resolves.toBeTruthy()
    })

    it('verifies registration when owner matches', async () => {
      const ctype = CType.fromSchema(rawCType, identityAlice.address)
      await expect(ctype.verifyStored()).resolves.toBeTruthy()
    })

    it('verifies registration when owner does not match', async () => {
      const ctype = CType.fromSchema(rawCType, identityBob.address)
      await expect(ctype.verifyStored()).resolves.toBeTruthy()
    })

    it('verifies owner when owner matches', async () => {
      const ctype = CType.fromSchema(rawCType, identityAlice.address)
      await expect(ctype.verifyOwner()).resolves.toBeTruthy()
    })

    it('does not verify owner when owner does not match', async () => {
      const ctype = CType.fromSchema(rawCType, identityBob.address)
      await expect(ctype.verifyOwner()).resolves.toBeFalsy()
    })
  })
})
