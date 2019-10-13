import Identity from '../identity/Identity'
import RequestForAttestation from './RequestForAttestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import Attestation from '../attestation/Attestation'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import IClaim from '../types/Claim'

function buildRequestForAttestation(
  claimer: Identity,
  ctype: string,
  contents: object,
  legitimations: AttestedClaim[]
): RequestForAttestation {
  // create claim
  const contentsCopy = contents
  const testCType: CType = CType.fromObject({
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
  const claim = {
    cTypeHash: testCType.hash,
    cTypeSchema: testCType.schema,
    contents: contentsCopy,
    owner: claimer.address,
  } as IClaim
  // build request for attestation with legimitations
  return RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimer,
    legitimations
  )
}

describe('RequestForAttestation', () => {
  const identityAlice = Identity.buildFromURI('//Alice')
  const identityBob = Identity.buildFromURI('//Bob')
  const identityCharlie = Identity.buildFromURI('//Charlie')

  const legitimationRequest: RequestForAttestation = buildRequestForAttestation(
    identityAlice,
    'legitimationCtype',
    {},
    []
  )
  // build attestation
  const legitimationAttestation: Attestation = new Attestation(
    legitimationRequest.rootHash,
    legitimationRequest.claim.cTypeHash,
    identityCharlie.address
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
    const propertyName = 'a'
    delete request.claim.contents[propertyName]
    delete request.claimHashTree[propertyName]
    expect(request.verifyData()).toBeFalsy()
  })

  it('hides the claim owner', () => {
    const request = buildRequestForAttestation(identityBob, 'ctype', {}, [])
    request.removeClaimOwner()
    expect(request.claimOwner.nonce).toBeUndefined()
    expect(request.claim.owner).toBeUndefined()
  })

  it('hides claim properties', () => {
    const request = buildRequestForAttestation(
      identityBob,
      'ctype',
      { a: 'a', b: 'b' },
      []
    )
    request.removeClaimProperties(['a'])

    expect((request.claim.contents as any).a).toBeUndefined()
    expect((request.claimHashTree as any).a.nonce).toBeUndefined()
    expect((request.claim.contents as any).b).toBe('b')
    expect((request.claimHashTree as any).b.nonce).toBeDefined()
  })
})
