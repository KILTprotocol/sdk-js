/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/ctype
 */

import type { ICType, IClaim, IClaimContents } from '@kiltprotocol/types'
import { CType } from './CType'
import { Claim } from '../claim/Claim'
import * as CTypeUtils from './CType.utils'

describe('Nested CTypes', () => {
  const didAlice = 'did:kilt:4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
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
    passportCType = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Passport',
      properties: {
        fullName: { type: 'string' },
        passportIdentifier: { type: 'string' },
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

    passport = CType.fromSchema(passportCType, didAlice)

    kyc = CType.fromSchema(kycCType, didAlice)

    claimContents = {
      fullName: 'Archer Macdonald',
      passportIdentifier: '34jd83jd',
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
        passportIdentifier: '34jd83jd',
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
        passportIdentifier: {
          $ref: `${passport.schema.$id}#/properties/passportIdentifier`,
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

    nestedCType = CType.fromSchema(nested, didAlice)

    deeplyNestedCType = CType.fromSchema(nestedDeeply, didAlice)

    nestedData = Claim.fromNestedCTypeClaim(
      nestedCType,
      [passport.schema, kyc.schema],
      claimContents,
      didAlice
    )

    nestedDeepData = Claim.fromNestedCTypeClaim(
      deeplyNestedCType,
      [passport.schema, kyc.schema],
      claimDeepContents,
      didAlice
    )
  })

  it('verify json-schema validator', () => {
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
        didAlice
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
        didAlice
      )
    ).toThrowError(
      new Error('Nested claim data does not validate against CType')
    )
  })
})
