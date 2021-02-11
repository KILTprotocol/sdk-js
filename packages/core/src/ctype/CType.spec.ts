/**
 * @packageDocumentation
 * @group unit/ctype
 * @ignore
 */

import { SubmittableResult } from '@polkadot/api'
import { TypeRegistry } from '@polkadot/types'
import { Option } from '@polkadot/types/codec'
import { SDKErrors } from '@kiltprotocol/utils'
import {
  ICType,
  CompressedCType,
  CTypeSchemaWithoutId,
  ICTypeSchema,
  CompressedCTypeSchema,
} from '@kiltprotocol/types'
import { BlockchainUtils } from '../blockchain'
import Claim from '../claim/Claim'
import Identity from '../identity/Identity'
import requestForAttestation from '../requestforattestation/RequestForAttestation'
import CType from './CType'
import CTypeUtils, { getIdForSchema } from './CType.utils'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('CType', () => {
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  const registry = new TypeRegistry()
  let ctypeModel: ICType['schema']
  let ctypeSchemaWithoutId: CTypeSchemaWithoutId
  let rawCType: ICType['schema']
  let identityAlice: Identity
  let identityBob: Identity
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

    identityAlice = Identity.buildFromURI('//Alice')

    claimCtype = CType.fromSchema(rawCType, identityAlice.address)
    identityBob = Identity.buildFromURI('//Bob')

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

    const tx = await ctype.store(identityAlice)
    const result = await BlockchainUtils.submitTxWithReSign(tx, identityAlice)
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
      owner: claimCtype.owner!.replace('8', 'D'),
    }

    // This tst is not possible as it throws the error for malformed object first
    // TODO: Discuss whether the specific check in the errorCheck is obsolete and therefore should be removed
    const faultyAddressTypeCType: ICType = ({
      schema: claimCtype.schema,
      hash: claimCtype.hash,
      owner: '4262626426',
    } as any) as ICType

    const wrongSchemaIdCType: ICType = {
      ...claimCtype,
      schema: {
        ...claimCtype.schema,
        $id: claimCtype.schema.$id.replace('1', '2'),
      },
    }
    expect(() => CType.fromCType(wrongHashCtype)).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(wrongHashCtype.hash, 'CType')
    )
    expect(() => CType.fromCType(faultySchemaCtype)).toThrowError(
      SDKErrors.ERROR_OBJECT_MALFORMED()
    )
    expect(() => CType.fromCType(invalidAddressCtype)).toThrowError(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      SDKErrors.ERROR_ADDRESS_INVALID(invalidAddressCtype.owner!, 'CType owner')
    )
    expect(() => CType.fromCType(faultyAddressTypeCType)).toThrowError(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      SDKErrors.ERROR_ADDRESS_INVALID(
        faultyAddressTypeCType.owner!,
        'CType owner'
      )
    )
    expect(() => CType.fromCType(wrongSchemaIdCType)).toThrowError(
      SDKErrors.ERROR_CTYPE_ID_NOT_MATCHING(
        getIdForSchema(wrongSchemaIdCType.schema),
        wrongSchemaIdCType.schema.$id
      )
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
    const faultySchema = [...compressedCType[2]]
    faultySchema.pop()
    const faultySchemaCTypeCompressed = [...compressedCType]
    faultySchemaCTypeCompressed[2] = faultySchema as CompressedCTypeSchema
    compressedCType.pop()
    delete rawCType.$id
    delete claimCtype.hash

    expect(() =>
      CTypeUtils.decompress(faultySchemaCTypeCompressed as CompressedCType)
    ).toThrow()
    expect(() => CTypeUtils.compressSchema(rawCType)).toThrow()

    expect(() => CTypeUtils.compress(claimCtype)).toThrow()

    expect(() => CTypeUtils.decompress(compressedCType)).toThrow()

    expect(() => CType.decompress(compressedCType)).toThrow()

    expect(() => claimCtype.compress()).toThrow()
  })
  it('verifies whether a ctype is registered with the address on chain ', async () => {
    blockchainApi.query.ctype.cTYPEs = jest.fn(async (hash: string) => {
      return new Option(registry, 'AccountId', claimCtype.owner)
    })
    expect(await claimCtype.verifyStored()).toBeTruthy()
    blockchainApi.query.ctype.cTYPEs = jest.fn(async (hash: string) => {
      return new Option(registry, 'AccountId', identityBob.address)
    })
    expect(await claimCtype.verifyOwner()).toBeFalsy()
    blockchainApi.query.ctype.cTYPEs = jest.fn(async (hash: string) => {
      return new Option(registry, 'AccountId', null)
    })
    expect(await claimCtype.verifyStored()).toBeFalsy()
  })
})

describe('blank ctypes', () => {
  let identityAlice: Identity
  let ctypeSchema1: ICType['schema']
  let ctypeSchema2: ICType['schema']
  let ctype1: CType
  let ctype2: CType

  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')

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
      requestForAttestation.fromClaimAndIdentity(claimA1, identityAlice)
        .rootHash
    ).not.toEqual(
      requestForAttestation.fromClaimAndIdentity(claimA2, identityAlice)
        .rootHash
    )
  })
  it('typeguard returns true or false for complete or incomplete CTypes', () => {
    expect(CType.isICType(ctype1)).toBeTruthy()
    expect(CType.isICType({ ...ctype2, owner: '' })).toBeFalsy()
  })
})
