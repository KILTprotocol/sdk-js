import { SubmittableResult } from '@polkadot/api'
import Claim from '../claim/Claim'
import {
  ERROR_ADDRESS_INVALID,
  ERROR_HASH_MALFORMED,
  ERROR_OBJECT_MALFORMED,
} from '../errorhandling/SDKErrors'
import Identity from '../identity/Identity'
import requestForAttestation from '../requestforattestation/RequestForAttestation'
import ICType, {
  CompressedCType,
  CTypeSchemaWithoutId,
  ICTypeSchema,
} from '../types/CType'
import CType from './CType'
import CTypeUtils from './CType.utils'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('CType', () => {
  let ctypeModel: ICType['schema']
  let ctypeSchemaWithoutId: CTypeSchemaWithoutId
  let rawCType: ICType['schema']
  let identityAlice: Identity
  let claimCtype: CType
  let claimContents: any
  let claim: Claim
  let compressedCType: CompressedCType
  beforeAll(async () => {
    ctypeModel = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'CtypeModel 1',
      properties: {
        'first-property': { type: 'integer' },
        'second-property': { type: 'string' },
      },
      type: 'object',
    }

    rawCType = {
      $id: 'kilt:ctype:0x2',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'CtypeModel 2',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    ctypeSchemaWithoutId = {
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'CtypeModel 1',
      properties: {
        'first-property': { type: 'integer' },
        'second-property': { type: 'string' },
      },
      type: 'object',
    }

    identityAlice = await Identity.buildFromURI('//Alice')

    claimCtype = CType.fromSchema(rawCType, identityAlice.address)

    claimContents = {
      name: 'Bob',
    }

    claim = Claim.fromCTypeAndClaimContents(
      claimCtype,
      claimContents,
      identityAlice.address
    )
    compressedCType = [
      claimCtype.hash,
      claimCtype.owner,
      [
        claimCtype.schema.$id,
        claimCtype.schema.$schema,
        claimCtype.schema.title,
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
    const ctype = CType.fromSchema(ctypeModel, identityAlice.address)

    const result = await ctype.store(identityAlice)
    expect(result).toBeInstanceOf(SubmittableResult)
    expect(result.isFinalized).toBeTruthy()
    expect(result.isCompleted).toBeTruthy()
  })

  it('makes ctype object from schema without id', () => {
    const ctype = CType.fromSchema(ctypeSchemaWithoutId, identityAlice.address)

    expect(ctype.schema.$id).toBe(
      'kilt:ctype:0xba15bf4960766b0a6ad7613aa3338edce95df6b22ed29dd72f6e72d740829b84'
    )
  })

  it('verifies the claim structure', () => {
    expect(claimCtype.verifyClaimStructure(claim)).toBeTruthy()
    claim.contents.name = 123
    expect(claimCtype.verifyClaimStructure(claim)).toBeFalsy()
  })

  it('throws error on faulty input', () => {
    const wrongHashCtype: ICType = {
      ...claimCtype,
      hash: '0x1234',
    }
    const faultySchemaCtype: ICType = {
      ...claimCtype,
      schema: ({ ...rawCType, properties: null } as unknown) as ICTypeSchema,
    }
    const invalidAddressCtype: ICType = {
      ...claimCtype,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      owner: claimCtype.owner!.replace('7', 'D'),
    }

    expect(() => CType.fromCType(wrongHashCtype)).toThrowError(
      ERROR_HASH_MALFORMED(wrongHashCtype.hash, 'CType')
    )
    expect(() => CType.fromCType(faultySchemaCtype)).toThrowError(
      ERROR_OBJECT_MALFORMED()
    )
    expect(() => CType.fromCType(invalidAddressCtype)).toThrowError(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ERROR_ADDRESS_INVALID(invalidAddressCtype.owner!, 'CType owner')
    )
  })

  it('compresses and decompresses the ctype object', () => {
    expect(CTypeUtils.compressSchema(claimCtype.schema)).toEqual(
      compressedCType[2]
    )

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
  let ctypeSchema2: ICType['schema']
  let ctype1: CType
  let ctype2: CType

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')

    ctypeSchema1 = {
      $id: 'kilt:ctype:0x3',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'hasDriversLicense',
      properties: {},
      type: 'object',
    }

    ctypeSchema2 = {
      $id: 'kilt:ctype:0x4',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'claimedSomething',
      properties: {},
      type: 'object',
    }

    ctype1 = CType.fromSchema(
      ctypeSchema1,
      identityAlice.signKeyringPair.address
    )
    ctype2 = CType.fromSchema(
      ctypeSchema2,
      identityAlice.signKeyringPair.address
    )
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
      (await requestForAttestation.fromClaimAndIdentity(claimA1, identityAlice))
        .message.rootHash
    ).not.toEqual(
      (await requestForAttestation.fromClaimAndIdentity(claimA2, identityAlice))
        .message.rootHash
    )
  })
  it('typeguard returns true or false for complete or incomplete CTypes', () => {
    expect(CType.isICType(ctype1)).toBeTruthy()
    expect(CType.isICType({ ...ctype2, owner: '' })).toBeFalsy()
  })
})
