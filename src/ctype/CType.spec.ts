import CType from './CType'
import Identity from '../identity/Identity'
import Crypto from '../crypto'
import ICType from '../types/CType'
import TxStatus from '../blockchain/TxStatus'
import Claim from '../claim/Claim'
import { IClaimMetadata } from '../types/Claim'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

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
  } as ICType

  const claimCtype = new CType({
    schema: {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    },
  } as ICType)

  const claimMetadata = {
    title: { default: 'CType Title' },
    description: {},
    properties: {
      name: { title: { default: 'Name' } },
    },
  } as IClaimMetadata

  const identityAlice = Identity.buildFromURI('//Alice')

  const claimContents = {
    name: 'Bob',
  }

  const claim = new Claim(
    claimCtype,
    claimContents,
    identityAlice,
    claimMetadata
  )
  console.log(claim.metadata.properties)
  it('stores ctypes', async () => {
    const testHash = Crypto.hashStr('1234')

    const ctype = new CType(ctypeModel)
    ctype.hash = testHash
    const resultCtype = {
      ...ctype,
      owner: identityAlice.address,
    }

    const resultTxStatus = new TxStatus('Finalised', Crypto.hashStr('987654'))
    require('../blockchain/Blockchain').default.__mockResultHash = resultTxStatus

    const result = await ctype.store(identityAlice)
    expect(result.type).toEqual(resultTxStatus.type)
    expect(result.payload).toMatchObject(resultCtype)
  })
  it('verifies the claim structure', () => {
    expect(claimCtype.verifyClaimStructure(claim)).toBeTruthy()
    expect(claimCtype.verifyClaimStructure(!claim)).toBeFalsy()
  })
})
