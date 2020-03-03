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
  let ctypeModel: ICType['schema']
  let rawCType: ICType['schema']
  let identityAlice: Identity
  let fromRawCType: ICType
  let fromCTypeModel: ICType
  let claimCtype: CType
  let claimContents: any
  let claim: Claim

  beforeAll(async () => {
    ctypeModel = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        'first-property': { type: 'integer' },
        'second-property': { type: 'string' },
      },
      type: 'object',
    }

    rawCType = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    identityAlice = await Identity.buildFromURI('//Alice')

    fromRawCType = {
      schema: rawCType,
      owner: identityAlice.address,
      hash: '',
    }

    fromCTypeModel = {
      schema: ctypeModel,
      owner: identityAlice.address,
      hash: '',
    }
    claimCtype = CType.fromCType(fromRawCType)

    claimContents = {
      name: 'Bob',
    }

    claim = Claim.fromCTypeAndClaimContents(
      claimCtype,
      claimContents,
      identityAlice.address
    )
  })

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
  let identityAlice: Identity
  let ctypeSchema1: ICType['schema']
  let icytype1: ICType
  let ctypeSchema2: ICType['schema']
  let icytype2: ICType
  let ctype1: CType
  let ctype2: CType

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')

    ctypeSchema1 = {
      $id: 'http://example.com/hasDriversLicense',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {},
      type: 'object',
    }

    icytype1 = {
      schema: ctypeSchema1,
      owner: identityAlice.address,
      hash: '',
    }

    ctypeSchema2 = {
      $id: 'http://example.com/claimedSomething',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {},
      type: 'object',
    }

    icytype2 = {
      schema: ctypeSchema2,
      owner: identityAlice.address,
      hash: '',
    }

    ctype1 = CType.fromCType(icytype1)
    ctype2 = CType.fromCType(icytype2)
  })

  it('two ctypes with no properties have different hashes if id is different', () => {
    expect(ctype1.owner).toEqual(ctype2.owner)
    expect(ctype1.schema).not.toEqual(ctype2.schema)
    expect(ctype1.hash).not.toEqual(ctype2.hash)
  })

  it('two claims on an empty ctypes will have different root hash', async () => {
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
      (await requestForAttestation.fromClaimAndIdentity(
        claimA1,
        identityAlice,
        undefined,
        undefined,
        false
      ))[0].rootHash
    ).not.toEqual(
      (await requestForAttestation.fromClaimAndIdentity(
        claimA2,
        identityAlice,
        undefined,
        undefined,
        false
      ))[0].rootHash
    )
  })
})
