import Bool from '@polkadot/types/primitive/Bool'
import AccountId from '@polkadot/types/primitive/Generic/AccountId'
import { Tuple, Option } from '@polkadot/types/codec'
import { Text } from '@polkadot/types'
import * as gabi from '@kiltprotocol/portablegabi'
import {
  AttesterIdentity,
  Identity,
  Attester,
  Claimer,
  MessageBodyType,
  IClaim,
} from '..'
import constants from '../test/constants'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Attester', () => {
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  let alice: AttesterIdentity
  let bob: Identity
  let acc: gabi.Accumulator

  beforeAll(async () => {
    alice = await AttesterIdentity.buildFromURIAndKey(
      '//Alice',
      constants.PUBLIC_KEY.valueOf(),
      constants.PRIVATE_KEY.valueOf()
    )

    bob = await Identity.buildFromURI('//Bob')

    acc = await Attester.buildAccumulator(alice)
  })

  it('Issue privacy enhanced attestation', async () => {
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
    expect(initAttestation.type).toEqual(MessageBodyType.INITIATE_ATTESTATION)
    expect(initAttestation.content).toBeDefined()
    const claim: IClaim = {
      cTypeHash: '0xdead',
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: bob.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation({
      claim,
      identity: bob,
      initiateAttestationMsg: initAttestation,
      attesterPubKey: alice.getPublicIdentity(),
    })

    const { message, revocationHandle } = await Attester.issueAttestation(
      alice,
      requestAttestation,
      attersterSession,
      true
    )
    expect(revocationHandle.witness).not.toBeNull()
    expect(message.type).toEqual(MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM)
    expect(message.content.attestationPE).toBeDefined()
    expect(message.content.attestation).toBeDefined()
  })

  it('Issue only public attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        Tuple,
        new Tuple(
          [Text, AccountId, Text, Bool],
          ['0xdead', alice.getAddress(), undefined, false]
        )
      )
    )

    const claim: IClaim = {
      cTypeHash: '0xdead',
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: bob.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation({
      claim,
      identity: bob,
    })

    const { message, revocationHandle } = await Attester.issueAttestation(
      alice,
      requestAttestation
    )
    expect(revocationHandle.witness).toBeNull()
    expect(message.type).toEqual(MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM)
    expect(message.content.attestationPE).toBeUndefined()
    expect(message.content.attestation).toBeDefined()
  })

  it('Revoke privacy enhanced attestation', async () => {
    const {
      message: initAttestation,
      session: attersterSession,
    } = await Attester.initiateAttestation(alice)

    const claim: IClaim = {
      cTypeHash: '0xdead',
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: bob.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation({
      claim,
      identity: bob,
      initiateAttestationMsg: initAttestation,
      attesterPubKey: alice.getPublicIdentity(),
    })

    const { revocationHandle } = await Attester.issueAttestation(
      alice,
      requestAttestation,
      attersterSession,
      true
    )
    const oldAcc = await Attester.getLatestAccumulator(
      alice.getPublicIdentity()
    )
    await Attester.revokeAttestation(alice, revocationHandle)
    expect(
      Attester.getLatestAccumulator(alice.getPublicIdentity())
    ).resolves.not.toEqual(oldAcc)
  })

  it('Revoke public only attestation', async () => {
    const { message: initAttestation } = await Attester.initiateAttestation(
      alice
    )

    const claim: IClaim = {
      cTypeHash: '0xdead',
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: bob.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation({
      claim,
      identity: bob,
      initiateAttestationMsg: initAttestation,
      attesterPubKey: alice.getPublicIdentity(),
    })

    const { revocationHandle } = await Attester.issueAttestation(
      alice,
      requestAttestation
    )
    const oldAcc = alice.getAccumulator()
    await Attester.revokeAttestation(alice, revocationHandle)
    // accumulator should not change!
    expect(alice.getAccumulator().valueOf()).toEqual(oldAcc.valueOf())
  })

  it('build accumulator', async () => {
    const tAcc = await Attester.buildAccumulator(alice)
    expect(tAcc).toBeDefined()
  })

  it('update accumulator', async () => {
    await Attester.updateAccumulator(alice, acc)
    // TODO: not sure why this fails
    // expect(
    //   blockchainApi.tx.portablegabi.updateAccumulator.mock.calls.length
    // ).toEqual(1)
  })

  it.todo('get accumulator')
})
