import CType from './CType'
import Identity from '../identity/Identity'
import ICType from '../types/CType'
// import Claim from '../claim/Claim'

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

  //   const claimContents = {
  //     name: 'Bob',
  //   }

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
    console.log('Nested:', nested)

    const fromNestedCType: ICType = {
      schema: nested,
      owner: identityAlice.address,
      hash: '',
    }
    console.log('nested CType:', fromNestedCType)

    const nestedCType = CType.fromCType(fromNestedCType)

    console.log(nestedCType)
  })
})
