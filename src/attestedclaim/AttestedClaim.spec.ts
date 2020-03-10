import Identity from '../identity/Identity'
import AttestedClaim, {
  compressAttestedClaim,
  decompressAttestedClaim,
} from './AttestedClaim'
import Attestation from '../attestation/Attestation'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Claim from '../claim/Claim'
import { CompressedAttestedClaim } from '../types/AttestedClaim'

function buildAttestedClaim(
  claimer: Identity,
  attester: Identity,
  ctype: string,
  contents: object,
  legitimations: AttestedClaim[]
): AttestedClaim {
  // create claim
  const identityAlice = Identity.buildFromURI('//Alice')

  const rawCType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const fromRawCType: ICType = {
    schema: rawCType,
    owner: identityAlice.address,
    hash: '',
  }

  const testCType: CType = CType.fromCType(fromRawCType)

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    contents,
    claimer.address
  )
  // build request for attestation with legimitations
  const requestForAttestation = RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimer,
    legitimations,
    null
  )
  // build attestation
  const testAttestation: Attestation = Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester
  )
  // combine to attested claim
  const attestedClaim: AttestedClaim = AttestedClaim.fromRequestAndAttestation(
    requestForAttestation,
    testAttestation
  )
  return attestedClaim
}

describe('RequestForAttestation', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

  const identityBob = Identity.buildFromURI('//Bob')
  const identityCharlie = Identity.buildFromURI('//Charlie')

  const legitimation: AttestedClaim = buildAttestedClaim(
    identityAlice,
    identityBob,
    'legitimationCtype',
    {},
    []
  )

  it('compresses and decompresses the attested claims object', () => {
    const legitimations = {
      request: {
        claim: {
          contents: {},
          cTypeHash:
            '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
          owner: '5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
        },
        claimHashTree: {},
        claimOwner: {
          nonce: 'bf968e14-1efa-4dd3-ad36-555ce2f336fb',
          hash:
            '0x1c7e02a1b1b3f71df2f3306fabee79f6099b7bec3cac99527ec593085e422502',
        },
        claimerSignature:
          '0x8af2ccf10b9ae3bd594142d24417f17b513ad69745a1016cfa44c2bfc4ed9fb4f721c26ebdb8571f231684eb4181fdc0b784518ce060b177e37288c1070bb808',
        cTypeHash: {
          nonce: 'b769442a-0114-42bb-8146-f0d6d61e83fb',
          hash:
            '0x1a39a7838fff94d7a2a0e5b9afaf459f8a5ebb5a7cad73ccfb99292f8fee72da',
        },
        rootHash:
          '0x8a300f4d71e06b34d790328bf799eaa2df00c821d463ebb9d1b3230b2f4288ae',
        legitimations: [],
        delegationId: null,
      },
      attestation: {
        claimHash:
          '0x8a300f4d71e06b34d790328bf799eaa2df00c821d463ebb9d1b3230b2f4288ae',
        cTypeHash:
          '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
        owner: '5GoNkf6WdbxCFnPdAnYYQyCjAKPJgLNxXwPjwTh6DGg6gN3E',
        revoked: false,
        delegationId: null,
      },
    }

    const compressedLegitimation: CompressedAttestedClaim = [
      [
        [
          {},
          '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
          '5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
        ],
        {},
        [
          '0x1c7e02a1b1b3f71df2f3306fabee79f6099b7bec3cac99527ec593085e422502',
          'bf968e14-1efa-4dd3-ad36-555ce2f336fb',
        ],
        '0x8af2ccf10b9ae3bd594142d24417f17b513ad69745a1016cfa44c2bfc4ed9fb4f721c26ebdb8571f231684eb4181fdc0b784518ce060b177e37288c1070bb808',
        [
          '0x1a39a7838fff94d7a2a0e5b9afaf459f8a5ebb5a7cad73ccfb99292f8fee72da',
          'b769442a-0114-42bb-8146-f0d6d61e83fb',
        ],
        '0x8a300f4d71e06b34d790328bf799eaa2df00c821d463ebb9d1b3230b2f4288ae',
        [],
        null,
      ],
      [
        '0x8a300f4d71e06b34d790328bf799eaa2df00c821d463ebb9d1b3230b2f4288ae',
        '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
        '5GoNkf6WdbxCFnPdAnYYQyCjAKPJgLNxXwPjwTh6DGg6gN3E',
        false,
        null,
      ],
    ]

    expect(compressAttestedClaim(legitimations)).toEqual(compressedLegitimation)

    expect(decompressAttestedClaim(compressedLegitimation)).toEqual(
      legitimations
    )

    expect(legitimation.compress()).toEqual(compressAttestedClaim(legitimation))

    expect(AttestedClaim.decompress(compressedLegitimation)).toEqual(
      legitimations
    )
    expect(AttestedClaim.decompress(compressedLegitimation)).not.toEqual(
      legitimation
    )

    expect(legitimation.compress()).not.toEqual(compressedLegitimation)
  })

  it('verify attested claims', async () => {
    const attestedClaim: AttestedClaim = buildAttestedClaim(
      identityCharlie,
      identityAlice,
      'ctype',
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )

    // check proof on complete data
    expect(attestedClaim.verifyData()).toBeTruthy()

    // build a repesentation excluding claim properties and verify proof
    const correctPresentation = attestedClaim.createPresentation(['a'])
    expect(correctPresentation.verifyData()).toBeTruthy()

    // just deleting a field will result in a wrong proof
    const falsePresentation = attestedClaim.createPresentation([])
    const propertyName = 'a'
    delete falsePresentation.request.claim.contents[propertyName]
    delete falsePresentation.request.claimHashTree[propertyName]
    expect(falsePresentation.verifyData()).toBeFalsy()
  })
})
