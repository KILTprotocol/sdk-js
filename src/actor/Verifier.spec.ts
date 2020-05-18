import Bool from '@polkadot/types/primitive/Bool'
import AccountId from '@polkadot/types/primitive/Generic/AccountId'
import { Tuple, Option } from '@polkadot/types/codec'
import { Text } from '@polkadot/types'
import { Verifier, Attester, Claimer, CombinedPresentation } from '..'
import { MessageBodyType } from '../messaging/Message'
import AttesterIdentity from '../attesteridentity/AttesterIdentity'
import Identity from '../identity/Identity'
import IClaim from '../types/Claim'
import constants from '../test/constants'
import Credential from '../credential/Credential'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Verifier', () => {
  let alice: AttesterIdentity
  let bob: Identity
  let claim: IClaim
  let credentialPE: Credential
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api

  beforeAll(async () => {
    alice = await AttesterIdentity.buildFromURI('//Alice', {
      key: {
        publicKey: constants.PUBLIC_KEY.valueOf(),
        privateKey: constants.PRIVATE_KEY.valueOf(),
      },
    })

    bob = await Identity.buildFromURI('//bob')

    claim = {
      cTypeHash: '0xdead',
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: bob.getPublicIdentity().address,
    }

    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        Tuple,
        new Tuple(
          [Text, AccountId, Text, Bool],
          ['0xdead', alice.getAddress(), undefined, false]
        )
      )
    )

    const {
      message: initAttestation,
      session: attersterSession,
    } = await Attester.initiateAttestation(alice)

    const {
      message: requestAttestation,
      session: claimerSession,
    } = await Claimer.requestAttestation({
      claim,
      identity: bob,
      initiateAttestationMsg: initAttestation,
      attesterPubKey: alice.getPublicIdentity(),
    })
    expect(requestAttestation.type).toEqual(
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
    )
    expect(
      requestAttestation.content.requestForAttestation.privacyEnhanced
    ).toBeDefined()
    if (
      requestAttestation.content.requestForAttestation.privacyEnhanced !== null
    ) {
      expect(
        requestAttestation.content.requestForAttestation.privacyEnhanced.getClaim()
      ).toEqual({
        claim: {
          cTypeHash: claim.cTypeHash,
          contents: claim.contents,
          owner: claim.owner,
        },
      })
    }
    const {
      message: attestationMessage,
      revocationHandle,
    } = await Attester.issueAttestation(
      alice,
      requestAttestation,
      attersterSession,
      true
    )
    expect(revocationHandle.witness).not.toBeNull()

    credentialPE = await Claimer.buildCredential(
      bob,
      attestationMessage,
      claimerSession
    )
  })

  it('request privacy enhanced presentation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(true)
    expect(session).toBeDefined()
    expect(request.content.allowPE).toBeTruthy()
    expect(request.content.peRequest).toBeDefined()
    expect(request.type).toEqual(MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES)
    expect(request.content.ctypes).toEqual(['this is a ctype hash'])
  })

  it('request public presentation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(false)
    expect(session).toBeDefined()
    expect(request.content.allowPE).toBeFalsy()
    expect(request.content.peRequest).toBeDefined()
    expect(request.type).toEqual(MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES)
    expect(request.content.ctypes).toEqual(['this is a ctype hash'])
  })

  it('verify privacy enhanced presentation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(true)

    const presentation = await Claimer.createPresentation(
      bob,
      request,
      [credentialPE],
      [alice.getPublicIdentity()]
    )
    expect(presentation.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE
    )
    expect(presentation.content).toBeInstanceOf(CombinedPresentation)

    const { verified: ok, claims } = await Verifier.verifyPresentation(
      presentation,
      session,
      [await Attester.buildAccumulator(alice)],
      [alice.getPublicIdentity()]
    )
    expect(ok).toBeTruthy()
    expect(Array.isArray(claims)).toBeTruthy()
    expect(claims.length).toEqual(1)
    const { owner, ...unownedClaim } = claim
    expect(claims[0].claim).toEqual(unownedClaim)
  })

  it('verify forbidden privacy enhanced presentation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(false)

    request.content.allowPE = true
    const presentation = await Claimer.createPresentation(
      bob,
      request,
      [credentialPE],
      [alice.getPublicIdentity()]
    )
    expect(presentation.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE
    )
    expect(presentation.content).toBeInstanceOf(CombinedPresentation)

    const { verified: ok, claims } = await Verifier.verifyPresentation(
      presentation,
      session,
      [await Attester.buildAccumulator(alice)],
      [alice.getPublicIdentity()]
    )
    expect(ok).toBeFalsy()
    expect(Array.isArray(claims)).toBeTruthy()
    expect(claims.length).toEqual(0)
  })

  it('verify public-only presentation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(false)

    const presentation = await Claimer.createPresentation(
      bob,
      request,
      [credentialPE],
      [alice.getPublicIdentity()],
      false
    )
    expect(presentation.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC
    )
    expect(Array.isArray(presentation.content)).toBeTruthy()

    const { verified: ok, claims } = await Verifier.verifyPresentation(
      presentation,
      session,
      [await Attester.buildAccumulator(alice)],
      [alice.getPublicIdentity()]
    )
    expect(ok).toBeTruthy()
    expect(Array.isArray(claims)).toBeTruthy()
    expect(claims.length).toEqual(1)
  })
})
