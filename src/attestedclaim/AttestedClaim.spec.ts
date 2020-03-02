import Identity from '../identity/Identity'
import AttestedClaim from './AttestedClaim'
import Attestation from '../attestation/Attestation'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Claim from '../claim/Claim'

async function buildAttestedClaim(
  claimer: Identity,
  attester: Identity,
  ctype: string,
  contents: object,
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
  // build request for attestation with legitimations
  const [
    requestForAttestation,
  ] = await RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimer,
    legitimations,
    null,
    false
  )
  // build attestation
  const testAttestation: Attestation = Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester
  )
  // combine to attested claim
  const attestedClaim: AttestedClaim = await AttestedClaim.fromRequestAndAttestation(
    claimer,
    requestForAttestation,
    testAttestation
  )
  return attestedClaim
}

describe('RequestForAttestation', () => {
  let identityAlice: Identity
  let identityBob: Identity
  let identityCharlie: Identity
  let legitimation: AttestedClaim

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')

    identityBob = await Identity.buildFromURI('//Bob')
    identityCharlie = await Identity.buildFromURI('//Charlie')

    legitimation = await buildAttestedClaim(
      identityAlice,
      identityBob,
      'legitimationCtype',
      {},
      []
    )
  })

  it('verify attested claims', async () => {
    const attestedClaim: AttestedClaim = await buildAttestedClaim(
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

    // build a representation excluding claim properties and verify proof
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
