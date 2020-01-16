import CType from './CType'
import Identity from '../identity/Identity'
import ICType from '../types/CType'
import Claim from '../claim/Claim'
import CTypeUtils from './CTypeUtils'

describe('Nested CTypes', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

  const passportCType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'test',
    properties: {
      fullName: { type: 'string' },
      passportIdentifer: { type: 'string' },
      streetAddress: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
    },
    type: 'object',
  }

  const kycCType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'test',
    properties: {
      ID: { type: 'string' },
      number: { type: 'string' },
      name: { type: 'string' },
    },
    type: 'object',
  }

  const fromPassportCType: ICType = {
    schema: passportCType,
    owner: identityAlice.address,
    hash: '',
  }

  const fromKYCCType: ICType = {
    schema: kycCType,
    owner: identityAlice.address,
    hash: '',
  }

  const passport = CType.fromCType(fromPassportCType)

  const kyc = CType.fromCType(fromKYCCType)

  const claimContents = {
    fullName: 'Archer Macdonald',
    passportIdentifer: '34jd83jd',
    streetAddress: '111 reichenberger Strasse',
    city: 'Berlin',
    state: 'Germany',
    ID: '82740927593982508378-0294584...',
    number: '345678',
    name: 'Archer Macdonald',
  }

  const nested: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'test',
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

  const fromNestedCType: ICType = {
    schema: nested,
    owner: identityAlice.address,
    hash: '',
  }

  const nestedCType = CType.fromCType(fromNestedCType)

  const nestedData = Claim.fromNestedCTypeClaim(
    nestedCType,
    [passport.schema, kyc.schema],
    claimContents,
    identityAlice.address
  )

  it('verify ajv compiler', () => {
    expect(
      CTypeUtils.compileSchema(
        nestedCType.schema,
        [passport.schema, kyc.schema],
        claimContents
      )
    ).toBeTruthy()

    // @ts-ignore
    claimContents.fullName = {}
    expect(() => {
      Claim.fromNestedCTypeClaim(
        nestedCType,
        [passport.schema, kyc.schema],
        claimContents,
        identityAlice.address
      )
    }).toThrowError(new Error('Claim data doesnt match and not valid'))
  })
  it('verify claim from a nested ctype', () => {
    expect(nestedData).toBeTruthy()
  })
})
