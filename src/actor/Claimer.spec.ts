import Bool from '@polkadot/types/primitive/Bool'
import AccountId from '@polkadot/types/generic/AccountId'
import { Tuple, Option } from '@polkadot/types/codec'
import { Text, TypeRegistry } from '@polkadot/types'
import AttesterIdentity from '../attesteridentity/AttesterIdentity'
import Identity from '../identity/Identity'
import constants from '../test/constants'
import { Attester, Claimer, IClaim } from '..'
import { MessageBodyType } from '../messaging/Message'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Claimer', () => {
  const registry = new TypeRegistry()
  let alice: AttesterIdentity
  let bob: Identity
  let Blockchain: any
  let claim: IClaim
  beforeAll(async () => {
    alice = await AttesterIdentity.buildFromURIAndKey(
      '//Alice',
      constants.PUBLIC_KEY.valueOf(),
      constants.PRIVATE_KEY.valueOf()
    )

    bob = await Identity.buildFromURI('//bob')

    Blockchain = require('../blockchain/Blockchain').default
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
  })

  it('request privacy enhanced attestation', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      const tuple = new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          [Text, AccountId, Text, Bool],
          ['0xdead', alice.getAddress(), undefined, false]
        )
      )
      return Promise.resolve(tuple)
    })

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
      attesterPubKey: alice.getPublicGabiKey(),
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
      attestation,
    } = await Attester.issueAttestation(
      alice,
      requestAttestation,
      attersterSession,
      true
    )
    expect(attestation.witness).not.toBeNull()

    const attestedClaim = await Claimer.buildAttestedClaim(
      bob,
      attestationMessage,
      claimerSession
    )
    expect(attestedClaim.credential).toBeDefined()
  })

  it('request only public attestation', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      const tuple = new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          [Text, AccountId, Text, Bool],
          ['0xdead', alice.getAddress(), undefined, false]
        )
      )
      return Promise.resolve(tuple)
    })

    const {
      message: requestAttestation,
      session: claimerSession,
    } = await Claimer.requestAttestation({
      claim,
      identity: bob,
      attesterPubKey: alice.getPublicGabiKey(),
    })
    expect(requestAttestation.type).toEqual(
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
    )
    expect(
      requestAttestation.content.requestForAttestation.privacyEnhanced
    ).toBeNull()

    const {
      message: attestationMessage,
      attestation,
    } = await Attester.issueAttestation(alice, requestAttestation)
    expect(attestation.witness).toBeNull()

    const attestedClaim = await Claimer.buildAttestedClaim(
      bob,
      attestationMessage,
      claimerSession
    )
    expect(attestedClaim.credential).toBeNull()
  })

  it.todo('Verify privacy enhanced presentation')

  it.todo('Verify public presentation')
})
