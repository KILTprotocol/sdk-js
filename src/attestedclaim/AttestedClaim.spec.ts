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

  it('compress attested claims', () => {
    const optimsedResult = legitimation.compress()
    expect(compressAttestedClaim(legitimation)).toEqual(optimsedResult)
    expect(decompressAttestedClaim(optimsedResult)).toEqual(legitimation)
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
