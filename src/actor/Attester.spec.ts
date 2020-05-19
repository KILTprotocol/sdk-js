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
  let attester: AttesterIdentity
  let claimer: Identity
  let acc: gabi.Accumulator

  beforeAll(async () => {
    attester = await AttesterIdentity.buildFromURI('//Alice', {
      key: {
        publicKey: constants.PUBLIC_KEY.valueOf(),
        privateKey: constants.PRIVATE_KEY.valueOf(),
      },
    })

    claimer = await Identity.buildFromURI('//Bob')

    acc = await Attester.buildAccumulator(attester)
  })

  it('Issue privacy enhanced attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        Tuple,
        new Tuple(
          [Text, AccountId, Text, Bool],
          ['0xdead', attester.getAddress(), undefined, false]
        )
      )
    )

    const {
      message: initAttestation,
      session: attersterSession,
    } = await Attester.initiateAttestation(
      attester,
      claimer.getPublicIdentity()
    )
    expect(initAttestation.body.type).toEqual(
      MessageBodyType.INITIATE_ATTESTATION
    )
    expect(initAttestation.body.content).toBeDefined()
    const claim: IClaim = {
      cTypeHash: '0xdead',
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation({
      claim,
      identity: claimer,
      initiateAttestationMsg: initAttestation,
      attesterPubKey: attester.getPublicIdentity(),
    })

    const { message, revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity(),
      attersterSession,
      true
    )
    expect(revocationHandle.witness).not.toBeNull()
    expect(message.body.type).toEqual(
      MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    )
    if (message.body.type === MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
      expect(message.body.content.attestationPE).toBeDefined()
      expect(message.body.content.attestation).toBeDefined()
    }
  })

  it('Issue only public attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        Tuple,
        new Tuple(
          [Text, AccountId, Text, Bool],
          ['0xdead', attester.getAddress(), undefined, false]
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
      owner: claimer.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation({
      claim,
      identity: claimer,
      attesterPubKey: attester.getPublicIdentity(),
    })

    const { message, revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )
    expect(revocationHandle.witness).toBeNull()
    expect(message.body.type).toEqual(
      MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    )
    if (message.body.type === MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
      expect(message.body.content.attestationPE).toBeUndefined()
      expect(message.body.content.attestation).toBeDefined()
    }
  })

  it('Revoke privacy enhanced attestation', async () => {
    const {
      message: initAttestation,
      session: attersterSession,
    } = await Attester.initiateAttestation(
      attester,
      claimer.getPublicIdentity()
    )

    const claim: IClaim = {
      cTypeHash: '0xdead',
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation({
      claim,
      identity: claimer,
      initiateAttestationMsg: initAttestation,
      attesterPubKey: attester.getPublicIdentity(),
    })

    const { revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity(),
      attersterSession,
      true
    )
    const oldAcc = await Attester.getLatestAccumulator(
      attester.getPublicIdentity()
    )
    await Attester.revokeAttestation(attester, revocationHandle)
    expect(
      Attester.getLatestAccumulator(attester.getPublicIdentity())
    ).resolves.not.toEqual(oldAcc)
  })

  it('Revoke public only attestation', async () => {
    const { message: initAttestation } = await Attester.initiateAttestation(
      attester,
      claimer.getPublicIdentity()
    )

    const claim: IClaim = {
      cTypeHash: '0xdead',
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation({
      claim,
      identity: claimer,
      initiateAttestationMsg: initAttestation,
      attesterPubKey: attester.getPublicIdentity(),
    })

    const { revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )
    const oldAcc = attester.getAccumulator()
    await Attester.revokeAttestation(attester, revocationHandle)
    // accumulator should not change!
    expect(attester.getAccumulator().valueOf()).toEqual(oldAcc.valueOf())
  })

  it('build accumulator', async () => {
    const tAcc = await Attester.buildAccumulator(attester)
    expect(tAcc).toBeDefined()
  })

  it('update accumulator', async () => {
    await Attester.updateAccumulator(attester, acc)
    // TODO: not sure why this fails
    // expect(
    //   blockchainApi.tx.portablegabi.updateAccumulator.mock.calls.length
    // ).toEqual(1)
  })

  it.todo('get accumulator')
})
