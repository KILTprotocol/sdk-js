import CType from './CType'
import Blockchain from '../blockchain/Blockchain'
import Identity from '../identity/Identity'
import Crypto from '../crypto'
import ICType from '../primitives/CType'

describe('CType', () => {
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

  it('verify model transformations', () => {
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

    const claimInput = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        'first-property': { type: 'integer', title: 'First Property' },
        'second-property': { type: 'string', title: 'Second Property' },
      },
      type: 'object',
      title: 'CType Title',
      required: ['first-property', 'second-property'],
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

    const ctypeFromInput = CType.fromInputModel(ctypeInput)
    const ctypeFromModel = new CType(ctypeModel)
    expect(JSON.stringify(ctypeFromInput.getModel())).toEqual(
      JSON.stringify(ctypeFromModel.getModel())
    )
    expect(JSON.stringify(ctypeFromInput.getClaimInputModel('en'))).toEqual(
      JSON.stringify(claimInput)
    )
    expect(JSON.stringify(ctypeFromInput.getCTypeInputModel())).toEqual(
      JSON.stringify(ctypeInput)
    )

    expect(ctypeFromInput.verifyClaimStructure(goodClaim)).toBeTruthy()
    expect(ctypeFromInput.verifyClaimStructure(badClaim)).toBeFalsy()

    expect(() => {
      // @ts-ignore
      new CType(goodClaim).verifyClaimStructure(goodClaim)
    }).toThrow(new Error('CType does not correspond to schema'))
    expect(() => {
      CType.fromInputModel(ctypeModel)
    }).toThrow(
      new Error('CType input does not correspond to input model schema')
    )
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
      submitTx: jest.fn((identity, tx) => {
        // if (statusCb) statusCb(new ExtrinsicStatus('Finalized'))
        return Promise.resolve(resultHash)
      }),
      getNonce: jest.fn(),
    } as Blockchain

    const identityAlice = Identity.buildFromURI('//Alice')
    const testHash = Crypto.hashStr('1234')

    const ctype = new CType(ctypeModel)
    ctype.hash = testHash
    expect(await ctype.store(blockchain, identityAlice)).toEqual(resultHash)
  })
})
