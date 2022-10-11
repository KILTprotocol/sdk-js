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
import { SDKErrors } from '@kiltprotocol/utils'
import * as CType from './CType'
import * as Claim from '../claim'

describe('Nested CTypes', () => {
  const didAlice = 'did:kilt:4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
  let passport: ICType
  let kyc: ICType
  let claimContents: IClaimContents
  let claimDeepContents: IClaim['contents']
  let nestedCType: ICType
  let deeplyNestedCType: ICType
  let nestedData: IClaim
  let nestedDeepData: IClaim

  beforeAll(async () => {
    passport = CType.fromProperties('Passport', {
      fullName: { type: 'string' },
      passportIdentifier: { type: 'string' },
      streetAddress: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
    })

    kyc = CType.fromProperties('KYC', {
      ID: { type: 'string' },
      number: { type: 'string' },
      name: { type: 'string' },
    })

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

    nestedCType = CType.fromProperties('KYC and Passport', {
      fullName: {
        $ref: `${passport.$id}#/properties/fullName`,
      },
      passportIdentifier: {
        $ref: `${passport.$id}#/properties/passportIdentifier`,
      },
      streetAddress: {
        $ref: `${passport.$id}#/properties/streetAddress`,
      },
      city: {
        $ref: `${passport.$id}#/properties/city`,
      },
      state: {
        $ref: `${passport.$id}#/properties/state`,
      },
      ID: {
        $ref: `${kyc.$id}#/properties/ID`,
      },
      number: {
        $ref: `${kyc.$id}#/properties/number`,
      },
      name: {
        $ref: `${kyc.$id}#/properties/name`,
      },
    })

    deeplyNestedCType = CType.fromProperties('test', {
      passport: {
        $ref: `${passport.$id}`,
      },
      KYC: {
        $ref: `${kyc.$id}`,
      },
    })

    nestedData = Claim.fromNestedCTypeClaim(
      nestedCType,
      [passport, kyc],
      claimContents,
      didAlice
    )

    nestedDeepData = Claim.fromNestedCTypeClaim(
      deeplyNestedCType,
      [passport, kyc],
      claimDeepContents,
      didAlice
    )
  })

  it('verify json-schema validator', () => {
    expect(() =>
      CType.verifyClaimAgainstNestedSchemas(
        nestedCType,
        [passport, kyc],
        claimContents
      )
    ).not.toThrow()

    claimContents.fullName = {}
    expect(() =>
      Claim.fromNestedCTypeClaim(
        nestedCType,
        [passport, kyc],
        claimContents,
        didAlice
      )
    ).toThrowError(SDKErrors.NestedClaimUnverifiableError)
    expect(() =>
      CType.verifyClaimAgainstNestedSchemas(
        deeplyNestedCType,
        [passport, kyc],
        claimDeepContents
      )
    ).not.toThrow()
    ;(claimDeepContents.passport as Record<string, unknown>).fullName = {}
    expect(() =>
      CType.verifyClaimAgainstNestedSchemas(
        deeplyNestedCType,
        [passport, kyc],
        claimDeepContents
      )
    ).toThrow()
  })

  it('verify claim from a nested ctype', () => {
    expect(nestedData).toBeDefined()
    expect(nestedData).not.toBeNull()
    expect(nestedDeepData).toBeDefined()
    expect(nestedDeepData).not.toBeNull()
    expect(() =>
      Claim.fromNestedCTypeClaim(
        deeplyNestedCType,
        [passport, kyc],
        claimDeepContents,
        didAlice
      )
    ).toThrowError(SDKErrors.NestedClaimUnverifiableError)
  })
})
