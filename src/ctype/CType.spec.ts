import CType from './CType'
import Identity from '../identity/Identity'
import Crypto from '../crypto'
import ICType from '../types/CType'
import TxStatus from '../blockchain/TxStatus'
import Claim from '../claim/Claim'
import { FINALIZED } from '../const/TxStatus'
import requestForAttestation from '../requestforattestation/RequestForAttestation'

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
})

describe('blank ctypes', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

  const ctypeSchema1: ICType['schema'] = {
    $id: 'http://example.com/hasDriversLicense',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {},
    type: 'object',
  }

  const icytype1: ICType = {
    schema: ctypeSchema1,
    owner: identityAlice.address,
    hash: '',
  }

  const ctypeSchema2: ICType['schema'] = {
    $id: 'http://example.com/claimedSomething',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {},
    type: 'object',
  }

  const icytype2: ICType = {
    schema: ctypeSchema2,
    owner: identityAlice.address,
    hash: '',
  }

  const ctype1 = CType.fromCType(icytype1)
  const ctype2 = CType.fromCType(icytype2)

  it('two ctypes with no properties have different hashes if id is different', () => {
    expect(ctype1.owner).toEqual(ctype2.owner)
    expect(ctype1.schema).not.toEqual(ctype2.schema)
    expect(ctype1.hash).not.toEqual(ctype2.hash)
  })

  it('two claims on an empty ctypes will have different root hash', () => {
    const claimA1 = Claim.fromCTypeAndClaimContents(
      ctype1,
      {},
      identityAlice.address
    )
    const claimA2 = Claim.fromCTypeAndClaimContents(
      ctype2,
      {},
      identityAlice.address
    )

    expect(
      requestForAttestation.fromClaimAndIdentity(claimA1, identityAlice)
        .rootHash
    ).not.toEqual(
      requestForAttestation.fromClaimAndIdentity(claimA2, identityAlice)
        .rootHash
    )
  })
})
