import CType from './CType'
import Identity from '../identity/Identity'
import Crypto from '../crypto'
import ICType, { CompressedCType } from '../types/CType'
import CTypeUtils from './CType.util'
import TxStatus from '../blockchain/TxStatus'
import Claim from '../claim/Claim'
import { FINALIZED } from '../const/TxStatus'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('CType', () => {
  const ctypeModel: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      'first-property': { type: 'integer' },
      'second-property': { type: 'string' },
    },
    type: 'object',
  }

  const rawCType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const identityAlice = Identity.buildFromURI('//Alice')

  const fromRawCType: ICType = {
    schema: rawCType,
    owner: identityAlice.address,
    hash: '',
  }

  const fromCTypeModel: ICType = {
    schema: ctypeModel,
    owner: identityAlice.address,
    hash: '',
  }
  const claimCtype = CType.fromCType(fromRawCType)

  const claimContents = {
    name: 'Bob',
  }

  const claim = Claim.fromCTypeAndClaimContents(
    claimCtype,
    claimContents,
    identityAlice.address
  )

  const compressedCType: CompressedCType = [
    claimCtype.hash,
    claimCtype.owner,
    [
      'http://example.com/ctype-1',
      'http://kilt-protocol.org/draft-01/ctype#',
      {
        name: {
          type: 'string',
        },
      },
      'object',
    ],
  ]

  it('stores ctypes', async () => {
    const testHash = Crypto.hashStr('1234')

    const ctype = CType.fromCType(fromCTypeModel)
    ctype.hash = testHash
    const resultCtype = {
      ...ctype,
      owner: identityAlice.address,
    }

    const resultTxStatus = new TxStatus(FINALIZED, Crypto.hashStr('987654'))
    require('../blockchain/Blockchain').default.__mockResultHash = resultTxStatus

    const result = await ctype.store(identityAlice)
    expect(result.type).toEqual(resultTxStatus.type)
    expect(result.payload).toMatchObject(resultCtype)
  })
  it('verifies the claim structure', () => {
    expect(claimCtype.verifyClaimStructure(claim)).toBeTruthy()
    // @ts-ignore
    claim.contents.name = 123
    expect(claimCtype.verifyClaimStructure(claim)).toBeFalsy()
  })
  it('throws error on wrong ctype hash', () => {
    const wrongRawCtype = {
      ...fromRawCType,
      hash: '0x1234',
    }
    expect(() => {
      return CType.fromCType(wrongRawCtype)
    }).toThrow()
  })
  it('compresses and decompresses the ctype object', () => {
    expect(CTypeUtils.compressCTypeSchema(rawCType)).toEqual(compressedCType[2])

    expect(CTypeUtils.compressCType(claimCtype)).toEqual(compressedCType)

    expect(CTypeUtils.decompressCType(compressedCType)).toEqual(claimCtype)

    expect(CType.decompress(compressedCType)).toEqual(claimCtype)

    expect(claimCtype.compress()).toEqual(compressedCType)
  })

  it('Negative test for compresses and decompresses the ctype object', () => {
    compressedCType.pop()
    delete rawCType.$id
    delete claimCtype.hash

    expect(() => CTypeUtils.compressCTypeSchema(rawCType)).toThrow()

    expect(() => CTypeUtils.compressCType(claimCtype)).toThrow()

    expect(() => CTypeUtils.decompressCType(compressedCType)).toThrow()

    expect(() => CType.decompress(compressedCType)).toThrow()

    expect(() => claimCtype.compress()).toThrow()
  })
})
