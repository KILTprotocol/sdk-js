import Bool from '@polkadot/types/primitive/Bool'
import AccountId from '@polkadot/types/primitive/Generic/AccountId'
import { Tuple, Option } from '@polkadot/types/codec'
import { Text } from '@polkadot/types'
import AttesterIdentity from '../attesteridentity/AttesterIdentity'
import Identity from '../identity/Identity'
import constants from '../test/constants'
import { Attester, Claimer, IClaim, Verifier, CombinedPresentation } from '..'
import { MessageBodyType } from '../messaging/Message'
import Credential from '../credential/Credential'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Claimer', () => {
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  let alice: AttesterIdentity
  let bob: Identity

  let claim: IClaim
  let credentialPE: Credential

  beforeAll(async () => {
    alice = await AttesterIdentity.buildFromURIAndKey(
      '//Alice',
      constants.PUBLIC_KEY.valueOf(),
      constants.PRIVATE_KEY.valueOf()
    )

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

  it('request privacy enhanced attestation', async () => {
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

    const attestedClaim = await Claimer.buildCredential(
      bob,
      attestationMessage,
      claimerSession
    )
    expect(attestedClaim.privacyCredential).toBeDefined()
  })

  it('request only public attestation', async () => {
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
      message: requestAttestation,
      session: claimerSession,
    } = await Claimer.requestAttestation({
      claim,
      identity: bob,
      attesterPubKey: alice.getPublicIdentity(),
    })
    expect(requestAttestation.type).toEqual(
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
    )
    expect(
      requestAttestation.content.requestForAttestation.privacyEnhanced
    ).toBeNull()

    const {
      message: attestationMessage,
      revocationHandle,
    } = await Attester.issueAttestation(alice, requestAttestation)
    expect(revocationHandle.witness).toBeNull()

    const attestedClaim = await Claimer.buildCredential(
      bob,
      attestationMessage,
      claimerSession
    )
    expect(attestedClaim.privacyCredential).toBeNull()
  })

  it('create privacy enhanced presentation', async () => {
    const request = (await Verifier.newRequest()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        attributes: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(true))[1]

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
  })

  it('create public presentation', async () => {
    const request = (await Verifier.newRequest()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        attributes: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(false))[1]

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
    expect(Array.isArray(presentation.content))
  })
})
