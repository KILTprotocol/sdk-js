import { IClaim } from '../claim/Claim'
import Identity from '../identity/Identity'

import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import Attestation from '../attestation/Attestation'

function buildAttestedClaim(
  claimer: Identity,
  attester: Identity,
  ctype: string,
  contents: object,
  legitimations: AttestedClaim[]
): AttestedClaim {
  // create claim
  const claim = {
    cType: ctype,
    contents,
    owner: claimer.address,
  } as IClaim
  // build request for attestation with legimitations
  const requstForAttestation: RequestForAttestation = new RequestForAttestation(
    claim,
    legitimations,
    claimer
  )
  // build attestation
  const attestation: Attestation = new Attestation(
    requstForAttestation,
    attester
  )
  // combine to attested claim
  const attestedClaim: AttestedClaim = new AttestedClaim(
    requstForAttestation,
    attestation
  )
  return attestedClaim
}

describe('RequestForAttestation', () => {
  const identityAlice = Identity.buildFromSeedString('Alice')
  const identityBob = Identity.buildFromSeedString('Bob')
  const identityCharlie = Identity.buildFromSeedString('Charlie')
  const identityDoria = Identity.buildFromSeedString('Doria')

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
      identityDoria,
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
    const propertyName: string = 'a'
    delete falsePresentation.request.claim.contents[propertyName]
    delete falsePresentation.request.claimHashTree[propertyName]
    expect(falsePresentation.verifyData()).toBeFalsy()
  })
})
