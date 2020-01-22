import { U8a } from '@polkadot/types'
import CType from './CType'
import Identity from '../identity/Identity'
import Crypto from '../crypto'
import ICType from '../types/CType'
import TxStatus from '../blockchain/TxStatus'
import Claim from '../claim/Claim'
import { getOwner } from './CType.chain'

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

  it('stores ctypes', async () => {
    const testHash = Crypto.hashStr('1234')

    const ctype = CType.fromCType(fromCTypeModel)
    ctype.hash = testHash
    const resultCtype = {
      ...ctype,
      owner: identityAlice.address,
    }

    const resultTxStatus = new TxStatus('Finalized', Crypto.hashStr('987654'))
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
  it('decodes query result', async () => {
    const encoded = new U8a(
      '0x50e7f659f2ea85c7d2d1a7603db4376f35a61c7aaa967e03e1b5d111183c1b58'
    )
    require('../blockchain/Blockchain').default.api.query.ctype.cTYPEs.mockReturnValueOnce(
      Promise.resolve(encoded)
    )
    return expect(getOwner(claimCtype.hash)).resolves.toEqual(
      encoded.toString()
    )
  })
  it('decodes emtpy query result to null', async () => {
    const encoded = new U8a(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    )
    require('../blockchain/Blockchain').default.api.query.ctype.cTYPEs.mockReturnValueOnce(
      Promise.resolve(encoded)
    )
    return expect(getOwner(claimCtype.hash)).resolves.toBeNull()
  })
})
