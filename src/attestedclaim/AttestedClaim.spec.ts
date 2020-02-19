import Identity from '../identity/Identity'
import AttesterIdentity from '../attesteridentity/AttesterIdentity'
import AttestedClaim from './AttestedClaim'
import AttestedClaimUtils from './AttestedClaim.utils'
import Attestation from '../attestation/Attestation'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Claim from '../claim/Claim'
import constants from '../test/constants'
import IClaim from '../types/Claim'
import { CompressedAttestedClaim } from '../types/AttestedClaim'

async function buildAttestedClaim(
  claimer: Identity,
  attester: Identity,
  contents: IClaim['contents'],
  legitimations: AttestedClaim[]
): Promise<AttestedClaim> {
  // create claim
  const identityAlice = await Identity.buildFromURI('//Alice')

  const rawCType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const testCType: CType = CType.fromSchema(rawCType, identityAlice.address)

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    contents,
    claimer.getAddress()
  )
  // build request for attestation with legitimations
  const {
    message: requestForAttestation,
  } = await RequestForAttestation.fromClaimAndIdentity(claim, claimer, {
    legitimations,
  })
  // build attestation
  const testAttestation = Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester.getPublicIdentity()
  )
  // combine to attested claim
  const attestedClaim = new AttestedClaim({
    request: requestForAttestation,
    attestation: testAttestation,
  })
  return attestedClaim
}

describe('RequestForAttestation', () => {
  let identityAlice: AttesterIdentity
  let identityBob: Identity
  let identityCharlie: Identity
  let legitimation: AttestedClaim
  let compressedLegitimation: CompressedAttestedClaim

  beforeAll(async () => {
    identityAlice = await AttesterIdentity.buildFromURI('//Alice', {
      key: {
        publicKey: constants.PUBLIC_KEY.valueOf(),
        privateKey: constants.PRIVATE_KEY.valueOf(),
      },
    })

    identityBob = await Identity.buildFromURI('//Bob')
    identityCharlie = await Identity.buildFromURI('//Charlie')

    legitimation = await buildAttestedClaim(identityAlice, identityBob, {}, [])
    compressedLegitimation = [
      [
        [
          legitimation.request.claim.contents,
          legitimation.request.claim.cTypeHash,
          legitimation.request.claim.owner,
        ],
        {},
        [
          legitimation.request.claimOwner.hash,
          legitimation.request.claimOwner.nonce,
        ],
        legitimation.request.claimerSignature,
        [
          legitimation.request.cTypeHash.hash,
          legitimation.request.cTypeHash.nonce,
        ],
        legitimation.request.rootHash,
        [],
        legitimation.request.delegationId,
        null,
      ],
      [
        legitimation.attestation.claimHash,
        legitimation.attestation.cTypeHash,
        legitimation.attestation.owner,
        legitimation.attestation.revoked,
        legitimation.attestation.delegationId,
      ],
    ]
  })

  it('verify attested claims', async () => {
    const attestedClaim = await buildAttestedClaim(
      identityCharlie,
      identityAlice,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )

    // check proof on complete data
    expect(AttestedClaim.verifyData(attestedClaim)).toBeTruthy()

    // build a representation excluding claim properties and verify proof
    const correctPresentation = attestedClaim.createPresentation(['a'])
    expect(AttestedClaim.verifyData(correctPresentation)).toBeTruthy()

    // just deleting a field will result in a wrong proof
    const falsePresentation = attestedClaim.createPresentation([])
    const propertyName = 'a'
    delete falsePresentation.request.claim.contents[propertyName]
    delete falsePresentation.request.claimHashTree[propertyName]
    expect(() => {
      return AttestedClaim.verifyData(falsePresentation)
    }).toThrow()
  })

  it('compresses and decompresses the attested claims object', () => {
    expect(AttestedClaimUtils.compress(legitimation)).toEqual(
      compressedLegitimation
    )

    expect(AttestedClaimUtils.decompress(compressedLegitimation)).toEqual(
      legitimation
    )

    expect(legitimation.compress()).toEqual(
      AttestedClaimUtils.compress(legitimation)
    )

    expect(AttestedClaim.decompress(compressedLegitimation)).toEqual(
      legitimation
    )
  })

  it('Negative test for compresses and decompresses the attested claims object', () => {
    compressedLegitimation.pop()
    delete legitimation.attestation

    expect(() => {
      AttestedClaimUtils.compress(legitimation)
    }).toThrow()

    expect(() => {
      AttestedClaimUtils.decompress(compressedLegitimation)
    }).toThrow()
    expect(() => {
      AttestedClaim.decompress(compressedLegitimation)
    }).toThrow()
    expect(() => {
      legitimation.compress()
    }).toThrow()
  it('should throw error on faulty constructor input', () => {
    expect( () => )
  })
  it('should throw error on faulty constructor input', () => {
    const [boolean] = crypto.checkAddress(
      identityAlice.signKeyringPair.address.replace('D', 'D'),
      42
    )
    console.log(boolean)
  })
})
