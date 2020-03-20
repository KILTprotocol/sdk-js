import Identity from '../identity/Identity'
import AttesterIdentity from '../attesteridentity/AttesterIdentity'
import AttestedClaim from './AttestedClaim'
import Attestation from '../attestation/Attestation'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Claim from '../claim/Claim'
import constants from '../test/constants'

async function buildAttestedClaim(
  claimer: Identity,
  attester: Identity,
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
    owner: identityAlice.getAddress(),
    hash: '',
  }

  const testCType = CType.fromCType(fromRawCType)

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    contents,
    claimer.getAddress()
  )
  // build request for attestation with legitimations
  const [
    requestForAttestation,
  ] = await RequestForAttestation.fromClaimAndIdentity({
    claim,
    identity: claimer,
    legitimations,
  })
  // build attestation
  const testAttestation = Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester.getPublicIdentity()
  )
  // combine to attested claim
  const attestedClaim = await AttestedClaim.fromRequestAndAttestation(
    claimer,
    requestForAttestation,
    testAttestation
  )
  return attestedClaim
}

async function buildAttestedClaimPE(
  claimer: Identity,
  attester: AttesterIdentity,
  contents: object,
  legitimations: AttestedClaim[]
): Promise<AttestedClaim> {
  // create claim
  const identityAlice = await Identity.buildFromURI('//Alice')

  const {
    session: attestersSession,
    message,
  } = await attester.initiateAttestation()

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
    owner: identityAlice.getAddress(),
    hash: '',
  }

  const testCType = CType.fromCType(fromRawCType)

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    contents,
    claimer.getAddress()
  )
  // build request for attestation with legitimations
  const [
    requestForAttestation,
    claimersSession,
  ] = await RequestForAttestation.fromClaimAndIdentity({
    claim,
    identity: claimer,
    legitimations,
    initiateAttestationMsg: message,
    attesterPubKey: attester.getPublicGabiKey(),
  })
  const attestationPE = (await attester.issuePrivacyEnhancedAttestation(
    attestersSession,
    requestForAttestation
  ))[1]

  // build attestation
  const testAttestation = Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester.getPublicIdentity()
  )
  // combine to attested claim
  const attestedClaim = await AttestedClaim.fromRequestAndAttestation(
    claimer,
    requestForAttestation,
    testAttestation,
    claimersSession,
    attestationPE
  )
  return attestedClaim
}

describe('RequestForAttestation', () => {
  let identityAlice: AttesterIdentity
  let identityBob: Identity
  let identityCharlie: Identity
  let legitimation: AttestedClaim

  beforeAll(async () => {
    identityAlice = await AttesterIdentity.buildFromURIAndKey(
      '//Alice',
      constants.PUBLIC_KEY.valueOf(),
      constants.PRIVATE_KEY.valueOf()
    )

    identityBob = await Identity.buildFromURI('//Bob')
    identityCharlie = await Identity.buildFromURI('//Charlie')

    legitimation = await buildAttestedClaim(identityAlice, identityBob, {}, [])
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
    expect(attestedClaim.verifyData()).toBeTruthy()

    // build a representation excluding claim properties and verify proof
    const correctPresentation = attestedClaim.createPresentation(['a'])
    expect(correctPresentation.verifyData()).toBeTruthy()
    // the credential must not be disclosed. It is a secret!
    expect(correctPresentation.credential).toBeUndefined()

    // just deleting a field will result in a wrong proof
    const falsePresentation = attestedClaim.createPresentation([])
    const propertyName = 'a'
    delete falsePresentation.request.claim.contents[propertyName]
    delete falsePresentation.request.claimHashTree[propertyName]
    expect(falsePresentation.verifyData()).toBeFalsy()
  })

  it('verify attested claim with PE in a non PE way', async () => {
    const attestedClaim = await buildAttestedClaimPE(
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
