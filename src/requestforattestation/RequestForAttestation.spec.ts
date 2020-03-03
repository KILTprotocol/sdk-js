import {
  ClaimerAttestationSession,
  AttesterAttestationSession,
} from '@kiltprotocol/portablegabi'
import Identity from '../identity/Identity'
import RequestForAttestation from './RequestForAttestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import Attestation from '../attestation/Attestation'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import IClaim from '../types/Claim'
import constants from '../test/constants'

async function buildRequestForAttestationPE(
  claimer: Identity,
  contents: object,
  legitimations: AttestedClaim[]
): Promise<
  [
    RequestForAttestation,
    ClaimerAttestationSession | null,
    Identity,
    AttesterAttestationSession
  ]
> {
  // create claim

  const identityAlice = await Identity.buildFromURI('//Alice')
  identityAlice.loadGabiKeys(constants.pubKey, constants.privKey)

  const { message, session } = await identityAlice.initiateAttestation()

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

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents,
    owner: claimer.address,
  }
  // build request for attestation with legitimations
  const [
    request,
    claimerSession,
  ] = await RequestForAttestation.fromClaimAndIdentity({
    claim,
    identity: claimer,
    legitimations,
    initiateAttestationMsg: message,
    attesterPubKey: identityAlice.publicGabiKey,
  })
  return [request, claimerSession, identityAlice, session]
}

async function buildRequestForAttestation(
  claimer: Identity,
  contents: object,
  legitimations: AttestedClaim[]
): Promise<RequestForAttestation> {
  // create claim

  const identityAlice = await Identity.buildFromURI('//Alice')
  identityAlice.loadGabiKeys(constants.pubKey, constants.privKey)

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

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents,
    owner: claimer.address,
  }
  // build request for attestation with legitimations
  const request = (await RequestForAttestation.fromClaimAndIdentity({
    claim,
    identity: claimer,
    legitimations,
  }))[0]
  return request
}

describe('RequestForAttestation', () => {
  let identityAlice: Identity
  let identityBob: Identity
  let identityCharlie: Identity
  let legitimationRequest: RequestForAttestation
  let legitimationAttestation: Attestation
  let legitimation: AttestedClaim

  beforeEach(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')
    identityBob = await Identity.buildFromURI('//Bob')
    identityCharlie = await Identity.buildFromURI('//Charlie')
    legitimationRequest = await buildRequestForAttestation(
      identityAlice,
      {},
      []
    )
    // build attestation
    legitimationAttestation = Attestation.fromRequestAndPublicIdentity(
      legitimationRequest,
      identityCharlie
    )
    // combine to attested claim
    legitimation = await AttestedClaim.fromRequestAndAttestation(
      identityBob,
      legitimationRequest,
      legitimationAttestation
    )
  })

  it('verify request for attestation', async () => {
    const request = await buildRequestForAttestation(
      identityBob,
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

  it('verify request for attestation (PE)', async () => {
    const [
      request,
      claimerSession,
      attester,
      attesterSession,
    ] = await buildRequestForAttestationPE(
      identityBob,
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
    expect(claimerSession).toBeDefined()
    expect(attester).toBeDefined()
    expect(attesterSession).toBeDefined()
  })

  it('throws on wrong hash in claim hash tree', async () => {
    const request = await buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    // @ts-ignore
    request.claimHashTree.a.nonce = '1234'
    expect(() => {
      request.verifyData()
    }).toThrow()
  })

  it('hides the claim owner', async () => {
    const request = await buildRequestForAttestation(identityBob, {}, [])
    request.removeClaimOwner()
    expect(request.claimOwner.nonce).toBeUndefined()
    expect(request.claim.owner).toBeUndefined()
  })

  it('hides claim properties', async () => {
    const request = await buildRequestForAttestation(
      identityBob,
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
