import * as gabi from '@kiltprotocol/portablegabi'
import {
  Attester,
  AttesterIdentity,
  Claimer,
  CType,
  IClaim,
  ICType,
  Identity,
  MessageBodyType,
} from '..'
import constants from '../test/constants'
import { mockChainQueryReturn } from '../blockchainApiConnection/__mocks__/BlockchainQuery'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Attester', () => {
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  let attester: AttesterIdentity
  let claimer: Identity
  let acc: gabi.Accumulator
  let rawCType: ICType['schema']
  let cType: CType
  beforeAll(async () => {
    attester = await AttesterIdentity.buildFromURI('//Alice', {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })

    claimer = await Identity.buildFromURI('//Bob')

    rawCType = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Attester',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    cType = CType.fromSchema(rawCType, claimer.getAddress())
    acc = await Attester.buildAccumulator(attester)
  })

  it('Issue privacy enhanced attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      mockChainQueryReturn('attestation', 'attestations', [
        cType.hash,
        attester.getAddress(),
        undefined,
        0,
      ])
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
      cTypeHash: cType.hash,
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getAddress(),
    }
    const { message: requestAttestation } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity(),
      {
        initiateAttestationMsg: initAttestation,
      }
    )

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
      mockChainQueryReturn<'attestation'>('attestation', 'attestations', [
        cType.hash,
        attester.getAddress(),
        undefined,
        0,
      ])
    )

    const claim: IClaim = {
      cTypeHash: cType.hash,
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity()
    )

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
      cTypeHash: cType.hash,
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity(),
      {
        initiateAttestationMsg: initAttestation,
      }
    )

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
    await expect(
      Attester.getLatestAccumulator(attester.getPublicIdentity())
    ).resolves.not.toEqual(oldAcc)
  })

  it('Revoke public only attestation', async () => {
    const { message: initAttestation } = await Attester.initiateAttestation(
      attester,
      claimer.getPublicIdentity()
    )

    const claim: IClaim = {
      cTypeHash: cType.hash,
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getPublicIdentity().address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity(),
      {
        initiateAttestationMsg: initAttestation,
      }
    )

    const { revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )
    const oldAcc = attester.getAccumulator()
    await Attester.revokeAttestation(attester, revocationHandle)
    // accumulator should not change!
    expect(attester.getAccumulator().toString()).toEqual(oldAcc.toString())
  })

  it('build accumulator', async () => {
    const tAcc = await Attester.buildAccumulator(attester)
    expect(tAcc).toBeDefined()
  })
  it('get accumulator', async () => {
    expect(attester.getAccumulator()).toBeDefined()
    expect(attester.getAccumulator()).toBeInstanceOf(gabi.Accumulator)
  })
  it('update accumulator', async () => {
    const beforeUpdate = attester.getAccumulator()
    await attester.updateAccumulator(acc)
    expect(
      blockchainApi.tx.portablegabi.updateAccumulator.mock.calls.length
    ).toEqual(1)
    expect(attester.getAccumulator()).toBeDefined()
    expect(attester.getAccumulator()).toBeInstanceOf(gabi.Accumulator)
    expect(attester.getAccumulator()).not.toStrictEqual(beforeUpdate)
  })
})
