import CType from './CType'
import Identity from '../identity/Identity'
import ICType from '../types/CType'
import Claim from '../claim/Claim'
// import CTypeUtils from './CTypeUtils'

describe('CType', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

  const passportCType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
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
    Identifier: {
      fullName: 'Archer Macdonald',
      passportIdentifer: '34jd83jd',
      streetAddress: '111 reichenberger Strasse',
      city: 'Berlin',
      state: 'Germany',
    },
    KYC: {
      ID: '82740927593982508378-0294584...',
      number: 324324324,
      name: 'Archer Macdonald',
    },
  }

  //   const claim = Claim.fromCTypeAndClaimContents(
  //     nestedCtype,
  //     claimContents,
  //     identityAlice.address
  //   )

  it('verifies the nested structure', () => {
    const nested: ICType['schema'] = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      type: 'object',
      properties: {
        Identifier: {
          type: 'object',
          $ref: passport.schema.$id,
        },
        KYC: {
          type: 'object',
          $ref: kyc.schema.$id,
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
    console.log(nestedData)
  })
})
