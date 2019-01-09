import { ICType } from './CType'
import { CTypeWrapperModel, CTypeInputModel } from './CTypeSchema'
import {
  verifyClaimStructure,
  verifySchema,
  verifySchemaWithErrors,
  store,
  verifyStored,
} from './CTypeUtils'

import Crypto from '../crypto'
import Blockchain from '../blockchain/Blockchain'
import Identity from '../identity/Identity'

jest.mock('../blockchain/Blockchain')

const ctypeInput = {
  $id: 'http://example.com/ctype-1',
  $schema: 'http://kilt-protocol.org/draft-01/ctype-input#',
  properties: [
    {
      title: 'First Property',
      $id: 'first-property',
      type: 'integer',
    },
    {
      title: 'Second Property',
      $id: 'second-property',
      type: 'string',
    },
  ],
  type: 'object',
  title: 'CType Title',
  required: ['first-property', 'second-property'],
}

const ctypeModel = {
  schema: {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      'first-property': { type: 'integer' },
      'second-property': { type: 'string' },
    },
    type: 'object',
  },
  metadata: {
    title: { default: 'CType Title' },
    description: {},
    properties: {
      'first-property': { title: { default: 'First Property' } },
      'second-property': { title: { default: 'Second Property' } },
    },
  },
} as ICType

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
    expect(verifyClaimStructure(goodClaim, ctypeModel.schema)).toBeTruthy()
    expect(verifyClaimStructure(badClaim, ctypeModel.schema)).toBeFalsy()
    expect(
      verifySchemaWithErrors(badClaim, CTypeWrapperModel, [''])
    ).toBeFalsy()
    expect(() => {
      verifyClaimStructure(badClaim, ctypeInput)
    }).toThrow(new Error('CType does not correspond to schema'))
  })
  it('verifies ctypes', () => {
    expect(verifySchema(ctypeInput, CTypeInputModel)).toBeTruthy()
    expect(verifySchema(ctypeModel, CTypeInputModel)).toBeFalsy()
  })

  it('stores ctypes', async () => {
    const resultHash = Crypto.hashStr('987654')
    // @ts-ignore
    const blockchain = {
      api: {
        tx: {
          ctype: {
            add: jest.fn((hash, signature) => {
              return Promise.resolve({ hash, signature })
            }),
          },
        },
        query: {
          ctype: {
            cTYPEs: jest.fn(hash => {
              return true
            }),
          },
        },
      },
      getStats: jest.fn(),
      listenToBlocks: jest.fn(),
      listenToBalanceChanges: jest.fn(),
      makeTransfer: jest.fn(),
      submitTx: jest.fn((identity, tx, statusCb) => {
        statusCb({
          type: 'Finalised',
          value: {
            encodedLength: 2,
          },
        })
        return Promise.resolve(resultHash)
      }),
      getNonce: jest.fn(),
    } as Blockchain

    const identityAlice = Identity.buildFromSeedString('Alice')
    const testHash = Crypto.hashStr('1234')
    const onsuccess = () => {
      return true
    }

    expect(await store(blockchain, identityAlice, testHash, onsuccess)).toEqual(
      resultHash
    )
    expect(verifyStored(blockchain, '1234')).toBeTruthy()
  })
})
