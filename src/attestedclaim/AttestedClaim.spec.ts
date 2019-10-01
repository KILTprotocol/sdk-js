import Identity from '../identity/Identity'
import AttestedClaim from './AttestedClaim'
import Attestation from '../attestation/Attestation'
import CType from '../ctype/CType'
import IAttestation from '../types/Attestation'
import ICType from '../types/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import IAttestedClaim from '../types/AttestedClaim'
import Claim from '../claim/Claim'

function buildAttestedClaim(
  claimer: Identity,
  attester: Identity,
  ctype: string,
  contents: object,
  legitimations: AttestedClaim[]
): AttestedClaim {
  // create claim

  const contentsCopy = contents
  const testCType: CType = new CType({
    schema: {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    },
    metadata: {
      title: { default: 'CType Title' },
      description: {},
      properties: {
        name: { title: { default: 'Name' } },
      },
    },
  } as ICType)
  const claim = new Claim(
    testCType.hash,
    contentsCopy,
    claimer.address,
    testCType.schema
  )
  // build request for attestation with legimitations
  const requestForAttestation = new RequestForAttestation(
    claim,
    legitimations,
    claimer
  )
  // build attestation
  const testAttestation: Attestation = Attestation.fromObject({
    claimHash: requestForAttestation.rootHash,
    cTypeHash: requestForAttestation.claim.cTypeHash,
    owner: attester.address,
    revoked: false,
  } as IAttestation)
  // combine to attested claim
  const attestedClaim: AttestedClaim = AttestedClaim.fromObject({
    request: requestForAttestation,
    attestation: testAttestation,
  } as IAttestedClaim)
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
