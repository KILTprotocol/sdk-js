import { SubmittableResult } from '@polkadot/api'
import CType from './CType'
import Identity from '../identity/Identity'
import ICType, { CompressedCType, ICTypeSchema } from '../types/CType'
import CTypeUtils from './CType.utils'
import Claim from '../claim/Claim'
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
  let compressedCType: CompressedCType
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
      owner: identityAlice.getAddress(),
      hash: '',
    }

    fromCTypeModel = {
      schema: ctypeModel,
      owner: identityAlice.getAddress(),
      hash: '',
    }
    claimCtype = CType.fromCType(fromRawCType)

    claimContents = {
      name: 'Bob',
    }

    claim = Claim.fromCTypeAndClaimContents(
      claimCtype,
      claimContents,
      identityAlice.getAddress()
    )
    compressedCType = [
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
  })

  it('stores ctypes', async () => {
    const ctype = CType.fromCType(fromCTypeModel)

    const result = await ctype.store(identityAlice)
    expect(result).toBeInstanceOf(SubmittableResult)
    expect(result.isFinalized).toBeTruthy()
    expect(result.isCompleted).toBeTruthy()
  })

  it('verifies the claim structure', () => {
    expect(claimCtype.verifyClaimStructure(claim)).toBeTruthy()
    // @ts-ignore
    claim.contents.name = 123
    expect(claimCtype.verifyClaimStructure(claim)).toBeFalsy()
  })

  it('throws error on faulty input', () => {
    const wrongHashCtype: ICType = {
      ...fromRawCType,
      hash: '0x1234',
    }
    const faultySchemaCtype: ICType = {
      ...fromRawCType,
      schema: ({ ...rawCType, properties: null } as unknown) as ICTypeSchema,
    }
    const invalidAddressCtype: ICType = {
      ...fromRawCType,
      owner: fromRawCType.owner ? fromRawCType.owner.replace('7', 'D') : null,
    }

    expect(() => {
      return CType.fromCType(wrongHashCtype)
    }).toThrow()
    expect(() => {
      return CType.fromCType(faultySchemaCtype)
    }).toThrow()
    expect(() => {
      return CType.fromCType(invalidAddressCtype)
    }).toThrow()
  })

  it('compresses and decompresses the ctype object', () => {
    expect(CTypeUtils.compressSchema(rawCType)).toEqual(compressedCType[2])

    expect(CTypeUtils.compress(claimCtype)).toEqual(compressedCType)

    expect(CTypeUtils.decompress(compressedCType)).toEqual(claimCtype)

    expect(CType.decompress(compressedCType)).toEqual(claimCtype)

    expect(claimCtype.compress()).toEqual(compressedCType)
  })

  it('Negative test for compresses and decompresses the ctype object', () => {
    compressedCType.pop()
    delete rawCType.$id
    delete claimCtype.hash

    expect(() => CTypeUtils.compressSchema(rawCType)).toThrow()

    expect(() => CTypeUtils.compress(claimCtype)).toThrow()

    expect(() => CTypeUtils.decompress(compressedCType)).toThrow()

    expect(() => CType.decompress(compressedCType)).toThrow()

    expect(() => claimCtype.compress()).toThrow()
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
      owner: identityAlice.getAddress(),
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
      owner: identityAlice.getAddress(),
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
      identityAlice.getAddress()
    )
    const claimA2 = Claim.fromCTypeAndClaimContents(
      ctype2,
      {},
      identityAlice.getAddress()
    )

    expect(
      (await requestForAttestation.fromClaimAndIdentity(claimA1, identityAlice))
        .message.rootHash
    ).not.toEqual(
      (await requestForAttestation.fromClaimAndIdentity(claimA2, identityAlice))
        .message.rootHash
    )
  })
})
