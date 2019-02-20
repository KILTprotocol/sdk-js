import { IClaim } from '../claim/Claim'
import Identity from '../identity/Identity'

import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import Attestation from '../attestation/Attestation'

function buildRequestForAttestation(
  claimer: Identity,
  ctype: string,
  contents: object,
  legitimations: AttestedClaim[]
): RequestForAttestation {
  // create claim
  const claim = {
    cType: ctype,
    contents,
    owner: claimer.address,
  } as IClaim
  // build request for attestation with legimitations
  return new RequestForAttestation(claim, legitimations, claimer)
}

describe('RequestForAttestation', () => {
  const identityAlice = Identity.buildFromSeedString('Alice')
  const identityBob = Identity.buildFromSeedString('Bob')
  const identityCharlie = Identity.buildFromSeedString('Charlie')

  const legitimationRequest: RequestForAttestation = buildRequestForAttestation(
    identityAlice,
    'legitimationCtype',
    {},
    []
  )
  // build attestation
  const legitimationAttestation: Attestation = new Attestation(
    legitimationRequest,
    identityCharlie
  )
  // combine to attested claim
  const legitimation: AttestedClaim = new AttestedClaim(
    legitimationRequest,
    legitimationAttestation
  )

  it('verify request for attestation', async () => {
    const request: RequestForAttestation = buildRequestForAttestation(
      identityBob,
      'ctype',
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )
    // check proof on complete data
    expect(request.verifyData()).toBeTruthy()

    // just deleting a field will result in a wrong proof
    const propertyName: string = 'a'
    delete request.claim.contents[propertyName]
    delete request.claimHashTree[propertyName]
    expect(request.verifyData()).toBeFalsy()
  })
})
