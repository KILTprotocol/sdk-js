import Bool from '@polkadot/types/primitive/Bool'
import AccountId from '@polkadot/types/primitive/Generic/AccountId'
import { Tuple, Option } from '@polkadot/types/codec'
import { Text, Vec } from '@polkadot/types'
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
  let alice: AttesterIdentity
  let bob: Identity
  let Blockchain: any

  beforeAll(async () => {
    alice = await AttesterIdentity.buildFromURIAndKey(
      '//Alice',
      constants.PUBLIC_KEY.valueOf(),
      constants.PRIVATE_KEY.valueOf()
    )

    bob = await Identity.buildFromURI('//Bob')

    Blockchain = require('../blockchain/Blockchain').default
  })

  it('Issue privacy enhanced attestation', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      const tuple = new Option(
        Tuple,
        new Tuple(
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
      attesterPubKey: alice.getPublicGabiKey(),
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
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      const tuple = new Option(
        Tuple,
        new Tuple(
          [Text, AccountId, Text, Bool],
          ['0xdead', alice.getAddress(), undefined, false]
        )
      )
      return Promise.resolve(tuple)
    })

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
    Blockchain.api.tx.attestation.revoke = jest.fn(() => {
      return Promise.resolve()
    })
    Blockchain.api.query.portablegabi.accumulator = jest.fn(() => {
      const tuple = new Option('Vec<Bytes>', new Vec('Bytes', '0xDEADBEEF'))
      return Promise.resolve(tuple)
    })
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
      attesterPubKey: alice.getPublicGabiKey(),
    })

    const { revocationHandle } = await Attester.issueAttestation(
      alice,
      requestAttestation,
      attersterSession,
      true
    )
    const oldAcc = alice.getAccumulator()
    await Attester.revokeAttestation(alice, revocationHandle)
    expect(oldAcc.valueOf()).not.toEqual(alice.getAccumulator().valueOf())
  })

  it('Revoke public only attestation', async () => {
    Blockchain.api.tx.attestation.revoke = jest.fn(() => {
      return Promise.resolve()
    })

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
      attesterPubKey: alice.getPublicGabiKey(),
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
})
