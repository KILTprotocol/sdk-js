/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/ctype
 */

import { SDKErrors } from '@kiltprotocol/utils'
import type {
  ICType,
  CompressedCType,
  CTypeSchemaWithoutId,
  ICTypeSchema,
  CompressedCTypeSchema,
  IClaim,
} from '@kiltprotocol/types'
import * as Claim from '../claim'
import * as RequestForAttestation from '../requestforattestation'
import * as Verification from './verification'
import * as Compression from './compression'
import { getOwner, isStored } from './chain'
import * as CType from './base.js'

jest.mock('./CType.chain')

const didAlice = 'did:kilt:4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
const didBob = 'did:kilt:4rDeMGr3Hi4NfxRUp8qVyhvgW3BSUBLneQisGa9ASkhh2sXB'

describe('CType', () => {
  let ctypeSchemaWithoutId: CTypeSchemaWithoutId
  let rawCType: ICType['schema']
  let claimCtype: ICType
  let claimContents: any
  let claim: IClaim
  let compressedCType: CompressedCType
  beforeAll(async () => {
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

    claimCtype = CType.fromSchema(rawCType, didAlice)

    claimContents = {
      name: 'Bob',
    }

    claim = Claim.fromCTypeAndClaimContents(claimCtype, claimContents, didAlice)
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

  it('makes ctype object from schema without id', () => {
    const ctype = CType.fromSchema(ctypeSchemaWithoutId, didAlice)

    expect(ctype.schema.$id).toBe(
      'kilt:ctype:0xba15bf4960766b0a6ad7613aa3338edce95df6b22ed29dd72f6e72d740829b84'
    )
  })

  it('verifies the claim structure', () => {
    expect(
      Verification.verifyClaimAgainstSchema(claim.contents, claimCtype.schema)
    ).toBeTruthy()
    claim.contents.name = 123
    expect(
      Verification.verifyClaimAgainstSchema(claim.contents, claimCtype.schema)
    ).toBeFalsy()
  })

  it('throws error on faulty input', () => {
    const wrongHashCtype: ICType = {
      ...claimCtype,
      hash: '0x1234',
    }
    const faultySchemaCtype: ICType = {
      ...claimCtype,
      schema: { ...rawCType, properties: null } as unknown as ICTypeSchema,
    }
    const invalidAddressCtype: ICType = {
      ...claimCtype,
      // @ts-ignore
      owner: claimCtype.owner!.replace('4', 'D'),
    }

    // This tst is not possible as it throws the error for malformed object first
    // TODO: Discuss whether the specific check in the errorCheck is obsolete and therefore should be removed
    const faultyAddressTypeCType: ICType = {
      schema: claimCtype.schema,
      hash: claimCtype.hash,
      owner: '4262626426',
    } as any as ICType

    const wrongSchemaIdCType: ICType = {
      ...claimCtype,
      schema: {
        ...claimCtype.schema,
        $id: claimCtype.schema.$id.replace('1', '2'),
      },
    }
    expect(() => Verification.verifyDataStructure(wrongHashCtype)).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED
    )
    expect(() =>
      Verification.verifyDataStructure(faultySchemaCtype)
    ).toThrowError(SDKErrors.ERROR_OBJECT_MALFORMED)
    expect(() =>
      Verification.verifyDataStructure(invalidAddressCtype)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Not a valid KILT did: did:kilt:Dp6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N"`
    )
    expect(() =>
      Verification.verifyDataStructure(faultyAddressTypeCType)
    ).toThrowErrorMatchingInlineSnapshot(`"Not a valid KILT did: 4262626426"`)
    expect(() =>
      Verification.verifyDataStructure(wrongSchemaIdCType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Provided $id \\"kilt:ctype:0xd5302762c62114f6455e0b373cccce20631c2a717004a98f8953e738e17c5d3c\\" and schema $id \\"kilt:ctype:0xd5301762c62114f6455e0b373cccce20631c2a717004a98f8953e738e17c5d3c\\" are not matching"`
    )
  })

  it('compresses and decompresses the ctype object', () => {
    expect(Compression.compressSchema(claimCtype.schema)).toEqual(
      compressedCType[2]
    )

    expect(Compression.compress(claimCtype)).toEqual(compressedCType)

    expect(Compression.decompress(compressedCType)).toEqual(claimCtype)
  })

  it('Negative test for compresses and decompresses the ctype object', () => {
    const faultySchema = [...compressedCType[2]]
    faultySchema.pop()
    const faultySchemaCTypeCompressed = [...compressedCType]
    faultySchemaCTypeCompressed[2] = faultySchema as CompressedCTypeSchema
    compressedCType.pop()
    // @ts-expect-error
    delete rawCType.$id
    // @ts-expect-error
    delete claimCtype.hash

    expect(() =>
      Compression.decompress(faultySchemaCTypeCompressed as CompressedCType)
    ).toThrow()
    expect(() => Compression.compressSchema(rawCType)).toThrow()

    expect(() => Compression.compress(claimCtype)).toThrow()

    expect(() => Compression.decompress(compressedCType)).toThrow()
  })

  it('verifies whether a ctype is registered on chain ', async () => {
    ;(isStored as jest.Mock).mockResolvedValue(false)
    await expect(Verification.verifyStored(claimCtype)).resolves.toBe(false)
    ;(isStored as jest.Mock).mockResolvedValue(true)
    await expect(Verification.verifyStored(claimCtype)).resolves.toBe(true)
  })

  it('verifies ctype owner on chain', async () => {
    ;(getOwner as jest.Mock).mockResolvedValue(didBob)
    await expect(Verification.verifyOwner(claimCtype)).resolves.toBe(false)
    ;(getOwner as jest.Mock).mockResolvedValue(claimCtype.owner)
    await expect(Verification.verifyOwner(claimCtype)).resolves.toBe(true)
    ;(getOwner as jest.Mock).mockResolvedValue(null)
    await expect(Verification.verifyOwner(claimCtype)).resolves.toBe(false)
  })
})

describe('blank ctypes', () => {
  let ctypeSchema1: ICType['schema']
  let ctypeSchema2: ICType['schema']
  let ctype1: ICType
  let ctype2: ICType

  beforeAll(async () => {
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

    ctype1 = CType.fromSchema(ctypeSchema1, didAlice)
    ctype2 = CType.fromSchema(ctypeSchema2, didAlice)
  })

  it('two ctypes with no properties have different hashes if id is different', () => {
    expect(ctype1.owner).toEqual(ctype2.owner)
    expect(ctype1.schema).not.toEqual(ctype2.schema)
    expect(ctype1.hash).not.toEqual(ctype2.hash)
  })

  it('two claims on an empty ctypes will have different root hash', async () => {
    const claimA1 = Claim.fromCTypeAndClaimContents(ctype1, {}, didAlice)
    const claimA2 = Claim.fromCTypeAndClaimContents(ctype2, {}, didAlice)

    expect(RequestForAttestation.fromClaim(claimA1).rootHash).not.toEqual(
      RequestForAttestation.fromClaim(claimA2).rootHash
    )
  })
  it('typeguard returns true or false for complete or incomplete CTypes', () => {
    expect(CType.isICType(ctype1)).toBeTruthy()
    expect(CType.isICType({ ...ctype2, owner: '' })).toBeFalsy()
  })
})