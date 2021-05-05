/**
 * @group unit/ctype
 */

import type { ICType, IClaim, IClaimContents } from '@kiltprotocol/types'
import CType from './CType'
import Identity from '../identity/Identity'
import Claim from '../claim/Claim'
import CTypeUtils from './CType.utils'

describe('Nested CTypes', () => {
  let identityAlice: Identity
  let passportCType: ICType['schema']
  let kycCType: ICType['schema']
  let passport: CType
  let kyc: CType
  let claimContents: IClaimContents
  let claimDeepContents: IClaim['contents']
  let nested: ICType['schema']
  let nestedDeeply: ICType['schema']
  let nestedCType: CType
  let deeplyNestedCType: CType
  let nestedData: Claim
  let nestedDeepData: Claim

  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')

    passportCType = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Passport',
      properties: {
        fullName: { type: 'string' },
        passportIdentifer: { type: 'string' },
        streetAddress: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
      },
      type: 'object',
    }

    kycCType = {
      $id: 'kilt:ctype:0x2',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'KYC',
      properties: {
        ID: { type: 'string' },
        number: { type: 'string' },
        name: { type: 'string' },
      },
      type: 'object',
    }

    passport = CType.fromSchema(passportCType, identityAlice.address)

    kyc = CType.fromSchema(kycCType, identityAlice.address)

    claimContents = {
      fullName: 'Archer Macdonald',
      passportIdentifer: '34jd83jd',
      streetAddress: '111 reichenberger Strasse',
      city: 'Berlin',
      state: 'Germany',
      ID: '82740927593982508378-0294584...',
      number: '345678',
      name: 'Archer Macdonald',
    }

    claimDeepContents = {
      passport: {
        fullName: 'Archer Macdonald',
        passportIdentifer: '34jd83jd',
        streetAddress: '111 reichenberger Strasse',
        city: 'Berlin',
        state: 'Germany',
      },
      KYC: {
        ID: '82740927593982508378-0294584...',
        number: '345678',
        name: 'Archer Macdonald',
      },
    }

    nested = {
      $id: 'kilt:ctype:0x3',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'KYC and Passport',
      type: 'object',
      properties: {
        fullName: {
          $ref: `${passport.schema.$id}#/properties/fullName`,
        },
        passportIdentifer: {
          $ref: `${passport.schema.$id}#/properties/passportIdentifer`,
        },
        streetAddress: {
          $ref: `${passport.schema.$id}#/properties/streetAddress`,
        },
        city: {
          $ref: `${passport.schema.$id}#/properties/city`,
        },
        state: {
          $ref: `${passport.schema.$id}#/properties/state`,
        },
        ID: {
          $ref: `${kyc.schema.$id}#/properties/ID`,
        },
        number: {
          $ref: `${kyc.schema.$id}#/properties/number`,
        },
        name: {
          $ref: `${kyc.schema.$id}#/properties/name`,
        },
      },
    }
    nestedDeeply = {
      $id: 'kilt:ctype:0x4',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'test',
      type: 'object',
      properties: {
        passport: {
          $ref: `${passport.schema.$id}`,
        },
        KYC: {
          $ref: `${kyc.schema.$id}`,
        },
      },
    }

    nestedCType = CType.fromSchema(nested, identityAlice.address)

    deeplyNestedCType = CType.fromSchema(nestedDeeply, identityAlice.address)

    nestedData = Claim.fromNestedCTypeClaim(
      nestedCType,
      [passport.schema, kyc.schema],
      claimContents,
      identityAlice.address
    )

    nestedDeepData = Claim.fromNestedCTypeClaim(
      deeplyNestedCType,
      [passport.schema, kyc.schema],
      claimDeepContents,
      identityAlice.address
    )
  })

  it('verify ajv compiler', () => {
    expect(
      CTypeUtils.validateNestedSchemas(
        nestedCType.schema,
        [passport.schema, kyc.schema],
        claimContents
      )
    ).toBeTruthy()

    claimContents.fullName = {}
    expect(() =>
      Claim.fromNestedCTypeClaim(
        nestedCType,
        [passport.schema, kyc.schema],
        claimContents,
        identityAlice.address
      )
    ).toThrowError(
      new Error('Nested claim data does not validate against CType')
    )
    expect(
      CTypeUtils.validateNestedSchemas(
        deeplyNestedCType.schema,
        [passport.schema, kyc.schema],
        claimDeepContents
      )
    ).toBeTruthy()
    ;(claimDeepContents.passport as Record<string, unknown>).fullName = {}
    expect(
      CTypeUtils.validateNestedSchemas(
        deeplyNestedCType.schema,
        [passport.schema, kyc.schema],
        claimDeepContents
      )
    ).toBeFalsy()
  })

  it('verify claim from a nested ctype', () => {
    expect(nestedData).toBeTruthy()
    expect(nestedDeepData).toBeTruthy()
    expect(() =>
      Claim.fromNestedCTypeClaim(
        deeplyNestedCType,
        [passport.schema, kyc.schema],
        claimDeepContents,
        identityAlice.address
      )
    ).toThrowError(
      new Error('Nested claim data does not validate against CType')
    )
  })
})
